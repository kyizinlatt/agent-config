// Per-tool configuration conventions — the single authority the checker reasons from.
//
// Every entry is grounded in the tool's OFFICIAL docs (see links). The pivotal fact: AGENTS.md
// is the cross-tool single source of truth (formalized Aug 2025; Linux Foundation Agentic AI
// Foundation since Dec 2025). Most tools read AGENTS.md natively; Claude Code is the holdout that
// reads CLAUDE.md and must BRIDGE to AGENTS.md via an `@AGENTS.md` import or a symlink.
//
// bridge:
//   'native'             → tool reads AGENTS.md directly; the SSOT being present is sufficient.
//   'import-or-symlink'  → tool reads its own file, which must reference AGENTS.md (no duplication).

export const SSOT = 'AGENTS.md';

export const TOOLS = [
  {
    id: 'claude',
    name: 'Claude Code',
    cli: ['claude'],
    // Claude reads CLAUDE.md, NOT AGENTS.md — docs: https://code.claude.com/docs/en/memory
    projectFiles: ['CLAUDE.md', '.claude/CLAUDE.md'],
    settings: '.claude/settings.json',
    readsAgentsMd: false,
    bridge: 'import-or-symlink',
    importSupportsTilde: true, // Claude's @import expands ~ and absolute paths (depth 4)
    globalPaths: ['~/.claude/CLAUDE.md'],
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    cli: ['gemini'],
    projectFiles: ['GEMINI.md'],
    readsAgentsMd: true, // via the AGENTS.md standard
    bridge: 'import-or-symlink',
    importSupportsTilde: false, // Gemini's memory @import resolves relative/absolute only — NOT ~
    globalPaths: ['~/.gemini/GEMINI.md'],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    cli: ['cursor-agent'],
    // Reads AGENTS.md natively AND .cursor/rules/*.mdc — docs: https://cursor.com/docs/context/rules
    projectFiles: ['AGENTS.md', '.cursor/rules'],
    rulesDir: '.cursor/rules',
    rulesExt: '.mdc', // plain .md in this dir is IGNORED by Cursor
    rulesFrontmatter: ['description', 'globs', 'alwaysApply'],
    readsAgentsMd: true,
    bridge: 'native',
  },
  {
    id: 'antigravity',
    name: 'Google Antigravity',
    cli: [],
    // AGENTS.md support since v1.20.3; workspace rules in .agents/rules/
    projectFiles: ['AGENTS.md', '.agents/rules'],
    rulesDir: '.agents/rules',
    readsAgentsMd: true,
    bridge: 'native',
    globalPaths: ['~/.gemini/AGENTS.md', '~/.gemini/GEMINI.md'],
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    cli: ['codex'],
    projectFiles: ['AGENTS.md'],
    readsAgentsMd: true,
    bridge: 'native',
    globalPaths: ['~/.codex/AGENTS.md'],
  },
  {
    id: 'kimi',
    name: 'Kimi Code',
    cli: ['kimi'],
    // Reads AGENTS.md + .kimi/AGENTS.md (merged root→cwd)
    projectFiles: ['AGENTS.md', '.kimi/AGENTS.md'],
    readsAgentsMd: true,
    bridge: 'native',
    globalPaths: ['~/.kimi-code/AGENTS.md', '~/.agents/AGENTS.md'],
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    cli: ['copilot'],
    projectFiles: ['AGENTS.md', '.github/copilot-instructions.md'],
    readsAgentsMd: true,
    bridge: 'native',
    globalPaths: ['~/.copilot/copilot-instructions.md'],
  },
  // Additional tools on the agents.md official supported-tools list — all read AGENTS.md natively.
  {
    id: 'windsurf',
    name: 'Windsurf',
    cli: ['windsurf'],
    projectFiles: ['AGENTS.md', '.windsurf/rules', '.windsurfrules'],
    rulesDir: '.windsurf/rules',
    readsAgentsMd: true,
    bridge: 'native',
  },
  {
    id: 'aider',
    name: 'Aider',
    cli: ['aider'],
    projectFiles: ['AGENTS.md'],
    readsAgentsMd: true,
    bridge: 'native',
  },
  {
    id: 'zed',
    name: 'Zed',
    cli: ['zed'],
    projectFiles: ['AGENTS.md'],
    readsAgentsMd: true,
    bridge: 'native',
  },
  {
    id: 'continue',
    name: 'Continue',
    cli: [],
    projectFiles: ['AGENTS.md', '.continue/rules'],
    rulesDir: '.continue/rules',
    readsAgentsMd: true,
    bridge: 'native',
  },
  {
    id: 'amazonq',
    name: 'Amazon Q',
    cli: ['q'],
    projectFiles: ['AGENTS.md', '.amazonq/rules'],
    rulesDir: '.amazonq/rules',
    readsAgentsMd: true,
    bridge: 'native',
  },
  {
    id: 'jules',
    name: 'Jules',
    cli: [],
    projectFiles: ['AGENTS.md'],
    readsAgentsMd: true,
    bridge: 'native',
  },
];

// Lookup helper.
export const toolById = (id) => TOOLS.find((t) => t.id === id);
