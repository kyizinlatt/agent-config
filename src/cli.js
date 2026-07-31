// CLI dispatch for `agent-config`. Commands: check (default) | report | init.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Findings } from './findings.js';
import { checkConfig } from './checks/config.js';
import { checkRules } from './checks/rules.js';
import { checkStyles } from './checks/styles.js';
import { checkEnvironment } from './checks/environment.js';
import { renderHuman, renderJson, renderReport } from './report.js';
import { detectInstalledClis, exists } from './detect.js';
import { toolById } from '../adapters/tools.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.dirname(HERE);

const HELP = `agent-config — audit a repo's AI-agent configuration against the AGENTS.md standard.

Usage:
  agent-config [check] [--path DIR] [--json]   Run config/rules/styles/environment checks (default)
  agent-config report [--path DIR]             Findings + a judgement prompt for your agent
  agent-config init [--tool ID] [--path DIR]   Scaffold AGENTS.md (SSOT) + a tool bridge
  agent-config --version | --help

Tools: claude, codex, kimi, cursor, antigravity, gemini, copilot
Exit codes: 0 = pass, 1 = warnings, 2 = failures.`;

function parseArgs(argv) {
  const opts = { command: 'check', path: process.cwd(), json: false, tool: null };
  const rest = [...argv];
  if (rest[0] && !rest[0].startsWith('-')) {
    opts.command = rest.shift();
  }
  while (rest.length) {
    const a = rest.shift();
    if (a === '--json') opts.json = true;
    else if (a === '--path') opts.path = path.resolve(rest.shift() || '.');
    else if (a === '--tool') opts.tool = rest.shift();
    else if (a === '--version' || a === '-v') opts.command = 'version';
    else if (a === '--help' || a === '-h') opts.command = 'help';
    else throw new Error(`unknown argument: ${a}`);
  }
  return opts;
}

export function runChecks(repo) {
  const findings = new Findings();
  checkConfig(repo, findings);
  checkRules(repo, findings);
  checkStyles(repo, findings);
  checkEnvironment(repo, findings);
  return findings;
}

export async function run(argv) {
  const opts = parseArgs(argv);

  if (opts.command === 'help') {
    console.log(HELP);
    return 0;
  }
  if (opts.command === 'version') {
    const pkg = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8'));
    console.log(pkg.version);
    return 0;
  }

  const repo = path.resolve(opts.path);
  if (!exists(repo)) throw new Error(`no such directory: ${repo}`);

  if (opts.command === 'init') return doInit(repo, opts.tool);

  if (opts.command !== 'check' && opts.command !== 'report') {
    throw new Error(`unknown command: ${opts.command}`);
  }

  const findings = runChecks(repo);
  if (opts.command === 'report') {
    console.log(renderReport(findings, repo));
  } else if (opts.json) {
    console.log(renderJson(findings, repo));
  } else {
    console.log(renderHuman(findings, repo));
  }
  return findings.exitCode();
}

// Scaffold the SSOT and, for bridge tools, a thin adapter that references it. Never overwrites.
function doInit(repo, toolId) {
  const agents = path.join(repo, 'AGENTS.md');
  if (!exists(agents)) {
    const tmpl = fs.readFileSync(path.join(PKG_ROOT, 'templates', 'AGENTS.md'), 'utf8');
    fs.writeFileSync(agents, tmpl.replaceAll('{{PROJECT_NAME}}', path.basename(repo)));
    console.log('created AGENTS.md (single source of truth)');
  } else {
    console.log('AGENTS.md: kept existing');
  }

  // Which tools to bridge? Explicit --tool, else every installed agent CLI, else Claude.
  let ids;
  if (toolId) ids = [toolId];
  else {
    const installed = detectInstalledClis().map((i) => i.tool.id);
    ids = installed.length ? installed : ['claude'];
  }

  for (const id of ids) {
    const tool = toolById(id);
    if (!tool) {
      console.log(`skip unknown tool: ${id}`);
      continue;
    }
    if (tool.bridge === 'native') {
      console.log(`${tool.name}: reads AGENTS.md natively — no bridge file needed`);
      continue;
    }
    // import-or-symlink tools (claude → CLAUDE.md, gemini → GEMINI.md).
    const bridgeFile = id === 'gemini' ? 'GEMINI.md' : 'CLAUDE.md';
    const dest = path.join(repo, bridgeFile);
    if (exists(dest)) {
      console.log(`${bridgeFile}: kept existing`);
      continue;
    }
    // Claude accepts a bare `@AGENTS.md`; Gemini's import needs an explicit relative prefix.
    const importLine = id === 'gemini' ? '@./AGENTS.md' : '@AGENTS.md';
    fs.writeFileSync(dest, `${importLine}\n`);
    console.log(`created ${bridgeFile} → imports AGENTS.md (${tool.name})`);
  }
  return 0;
}
