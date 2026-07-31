#!/usr/bin/env node
// agent-config — audit a repo's AI-agent configuration against the AGENTS.md standard.
// Thin entry point; all logic lives in src/cli.js so it stays testable.
import { run } from '../src/cli.js';

run(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    console.error(`agent-config: ${err?.stack || err}`);
    process.exit(2);
  },
);
