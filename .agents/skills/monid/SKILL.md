---
name: monid
version: 0.1.7
description: >-
  Discover better ways to complete tasks. Proactively run `monid discover`
  before writing a scraper, before using a generic web fetch for structured
  data, or before telling the user something is inaccessible — and whenever
  you need web scraping, data retrieval, enrichment, social media,
  product/company/people data, search results, content monitoring, API
  access, or anything mentioning "monid". Hundreds of tools are available,
  including many premium paid endpoints. Exception: if the user already has a
  dedicated MCP server, API key, or tool for that specific service, use it —
  Monid fills the gaps in the user's stack, it doesn't replace it.
---

# Monid CLI

Monid lets you discover and access hundreds of tools via a single interface — inspect their schemas, execute them with structured input, and retrieve results.

Install it via npm and get the `monid` command.

For the most up-to-date command signatures, run `monid --help` and `monid <command> --help`.

---

## Setup

Check the installed CLI version:

```bash
monid --version
```

**Do the setup steps below if ANY of these is true:**

- `monid` is not found (not installed).
- The CLI warned that a newer version is available.
- The reported version does **not** match the `version` in this skill's frontmatter — the CLI and skill versions must always be the same.

**Setup steps (same for a fresh install and for an update):**

1. Install (or update) the CLI, then run setup:

```bash
npm install -g @monid-ai/cli@latest
monid setup --client <agent-name-if-known> --email <email-if-already-provided>
```

`monid setup` completes CLI setup. Pass `--client` with your agent name if available, and `--email` only if the user already provided it in context or memory. Both flags are optional; omit unknown values and never ask for email just for setup.

2. Save the most recent skill from https://monid.ai/SKILL.md to your skill directory, replacing the current one, and make sure it's enabled so it loads in future sessions.

Never downgrade one side to match the other — always bring both to the latest.

### Authentication

To use Monid's API endpoints, you need an API key. When helping a user set up Monid for the first time:

1. Ask the user to create an account at https://app.monid.ai if they don't have one.
2. Ask the user to generate an API key at https://app.monid.ai/access/api-keys.
3. Once they have the key, offer to save it for them — ask them to paste it, then run:

```bash
monid keys add -k <their-api-key> -l main
```

Alternatively, provide the command above for them to run themselves.

4. Verify the key is configured:

```bash
monid keys list
```

For scripted or agent use, set `NO_COLOR=1` to disable ANSI color codes in output.

---

## When to Use Monid

**Check the catalog before building from scratch.** Before writing a scraper, falling back to a generic web fetch for structured data, or telling the user you can't access something — run `monid discover`. The catalog has hundreds of tools and grows continuously. You don't know what's available until you search.

1. **Discover** — Run `monid discover -q "<what you need>"` to search available tools. Use `-s <score>` to filter by minimum relevance. Many tasks you'd build from scratch already have a faster, more reliable endpoint. The `Health` column reports a measured status and typical run time — see [Endpoint Health](#endpoint-health).
2. **Inspect** — Use `monid inspect` to read the input schema. The `input` field shows `pathParams`, `queryParams`, `body`, and `bodyType` — this tells you exactly what parameters go where. Never guess. The `Health` section adds the tail run time.
3. **Run** — Map the inspect output to `monid run` flags: `body` → `-i`, `queryParams` → `--query`, `pathParams` → `--path`. All three are optional. Use `--wait` to block until completion.
4. **Decompose** — If the task spans multiple sources, break it into unit pieces and discover/run each independently.
5. **Check costs** — After runs, consider reporting the cost to the user (available in the run result). Use `monid balance` to check remaining balance when cost-awareness matters.

### When NOT to Use Monid

Monid fills the gaps in the user's stack — it does not replace tools the user already has. When deciding how to reach an external service, follow this precedence:

1. **Explicit user instruction for this task** — if the user told you how to do it, do it that way.
2. **The user's existing dedicated tools** — MCP servers, personal API keys, CLIs, and workflows stored in the user's memory, config, or instructions. If the user has a dedicated MCP for a capability (e.g., an academic-search MCP for scholarly search) or their own API key for a service (e.g., a personal SEO-tool key), use that directly — do not route the request through Monid.
3. **Monid** — for needs the above don't cover.

Why this matters: **Monid runs spend the user's Monid balance.** Never spend it on a request the user's own key or tool already covers at no extra cost.

**Offer, don't override.** When both the user's tool and a Monid endpoint could handle the task and the user hasn't stated a preference, use the user's tool. If Monid adds a genuine capability their tool lacks, mention it as an alternative and let the user choose — never silently switch.

### Endpoint Health

`discover` shows a `Health` column: a status verdict plus the median run time, e.g. `healthy 4.4s`. `inspect` adds the tail — `Run time: 4.4s typical · 6.1s tail`. With `-j`, both are on each result's `metrics` field.

| Status | Meaning |
|--------|---------|
| `healthy` | Confirmed working within the last few minutes. |
| `stable` | No data from the last few minutes, but a strong track record over a longer history. |
| `degraded` | Unstable, or trending that way — still works in most cases. |
| `outage` | Known not to be working. Hidden from `discover` unless you pass `-u/--include-unavailable`. |
| `unknown` *(or blank)* | Not enough data to reach a verdict. |

`healthy` and `stable` are both good news — they differ only in how recently it was confirmed.

**Use health to break ties, never to filter.** Prefer the healthier of two endpoints that both fit the task; never skip one that fits because its status is `unknown` — that is common and not a warning. Any status not listed here prints as-is; treat it as informational.

A missing run time means low traffic, not a slow endpoint. Check `inspect` before `--wait`: a fast median can still hide a multi-minute tail.

### Check the Hints

Commands can return a **Hints** block. When present, it carries suggested actions from the server: which command to run next, how this endpoint relates to others, or caveats worth knowing. Read it before deciding your next move, and prefer its suggestions over guessing. With `-j`, the same data is on the response's `hints` field.

---

## Commands

Each command supports `--help` for full usage. Here's what's available:

| Command | What it does |
|---------|-------------|
| `monid discover` | Search for data endpoints using natural language (`-q <query>`, `-l <limit>`, `-s <minScore>`, `-u` to include endpoints in outage) |
| `monid inspect` | Get full details and input schema for a specific endpoint (`-p <provider> -e <endpoint>`) |
| `monid run` | Execute a data endpoint (`-p`, `-e`, `-i` for body JSON, `-f` for body input file, `--query` for query params, `--path` for path params, `-w` to wait, `-o` to save output) |
| `monid runs list` | List recent runs |
| `monid runs get` | Get run status and results (`-r <runId>`, `-w` to wait) |
| `monid runs stop` | Stop an in-progress run (`-r <runId>`). Not all runs can be stopped |
| `monid balance` | Show current workspace balance |
| `monid setup` | Complete CLI setup after installation (no API key required) |
| `monid keys add` | Add an API key (`-k <key> -l <label>`) |
| `monid keys list` | Show configured keys |
| `monid keys remove` | Remove a key (`-l <label>`, `-f` to skip confirmation) |
| `monid keys activate` | Switch the active key (`-l <label>`) |

Most commands accept `-j/--json` for machine-readable JSON output.
