# Contributing

Thanks for helping. `main` is protected: force-push and deletion are blocked, and
`Test / Node 22` must pass before a PR can merge. Direct write access is maintainers only —
everyone else contributes via fork + pull request.

## Fork workflow

1. Fork [kyizinlatt/agent-pipx](https://github.com/kyizinlatt/agent-pipx) on GitHub.
2. Clone your fork and create a branch from `main`:

   ```sh
   git clone https://github.com/<you>/agent-pipx.git
   cd agent-pipx
   git checkout -b your-topic
   ```

3. Make changes. Keep the repo rules in [AGENTS.md](AGENTS.md) — especially **zero runtime
   dependencies** (Node built-ins only) and updating `adapters/tools.js` (with docs citations)
   instead of hard-coding tool facts in checks.
4. Run tests and a self-check locally:

   ```sh
   node --test
   node bin/agent-pipx.js check
   ```

5. Push to your fork and open a PR against `main` on the upstream repo.
6. A maintainer reviews and merges when CI is green.

## What to expect on review

- New checks need a synthetic-repo test under `test/`.
- Findings stay advisory data: `fail` / `warn` / `pass` meanings and exit codes `0` / `1` / `2`
  must not drift.
- Do not commit secrets, personal names, machine paths, or private repo names — this repo is
  public.
- Prefer small, focused PRs.

## Issues

Bug reports and feature ideas: [GitHub Issues](https://github.com/kyizinlatt/agent-pipx/issues).
Security concerns: see [SECURITY.md](SECURITY.md).
