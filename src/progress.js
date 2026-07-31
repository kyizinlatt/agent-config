// TTY progress for long-running checks. Silent when stdout is not a TTY or when
// machine-readable output (--json/--sarif) is requested — progress must not corrupt those.
import { CATEGORIES } from './findings.js';

const useColor = () => process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (useColor() ? `\x1b[${code}m${s}\x1b[0m` : s);

const CHECK = '\u2713';
const DOT = '\u00B7'; // ·
const SPINNER = ['\u280B', '\u2819', '\u2839', '\u2838', '\u283C', '\u2834', '\u2826', '\u2827', '\u2807', '\u280F'];

export const CHECK_STEPS = CATEGORIES.map((name) => ({
  name,
  detail: {
    Secrets: 'scanning config for credentials',
    Config: 'adapters, bridges, hooks, MCP',
    Rules: 'AGENTS.md SSOT quality',
    Styles: 'stack antipatterns',
    Environment: 'tooling, lockfile, quality gate',
  }[name],
}));

/**
 * @param {{ enabled?: boolean, stream?: NodeJS.WritableStream }} opts
 */
export function createProgress({ enabled = false, stream = process.stderr } = {}) {
  if (!enabled) {
    return {
      begin() {},
      start() {},
      done() {},
      end() {},
    };
  }

  let spinTimer = null;
  let spinIdx = 0;
  let current = null;
  const startedAt = Date.now();

  function clearLine() {
    stream.write('\r\x1b[2K');
  }

  function stopSpin() {
    if (spinTimer) {
      clearInterval(spinTimer);
      spinTimer = null;
    }
  }

  return {
    begin(repo) {
      stream.write(`\n${c('1', 'Checking')} ${c('2', repo)}\n\n`);
    },

    start(name, detail) {
      stopSpin();
      current = name;
      spinIdx = 0;
      const label = () =>
        `  ${c('36', SPINNER[spinIdx % SPINNER.length])} ${name.padEnd(11)} ${c('2', detail || '')}`;
      stream.write(label());
      spinTimer = setInterval(() => {
        spinIdx++;
        clearLine();
        stream.write(label());
      }, 80);
    },

    done(name) {
      stopSpin();
      clearLine();
      stream.write(`  ${c('32', CHECK)} ${name.padEnd(11)} ${c('2', 'done')}\n`);
      current = null;
    },

    end() {
      stopSpin();
      if (current) {
        clearLine();
        stream.write(`  ${c('32', CHECK)} ${current.padEnd(11)} ${c('2', 'done')}\n`);
        current = null;
      }
      const ms = Date.now() - startedAt;
      stream.write(`\n  ${c('2', `checked ${CHECK_STEPS.length} areas in ${ms}ms`)}\n`);
    },
  };
}

/** Static checklist line for final human/report output (always shown). */
export function renderCheckedSummary() {
  const names = CHECK_STEPS.map((s) => s.name).join(` ${DOT} `);
  return `  ${c('2', `Checked: ${names}`)}`;
}
