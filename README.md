# cortico-world-mcp

[English](README.md) ｜ [简体中文](README_zh.md)

Owner: `src/world.ts`

A Cortico World that connects Model Context Protocol servers and gives the bot one stable way to use
their tools. Servers are declared in `worlds.mcp.servers`; each one starts at mount time, its tools
are discovered then and can be refreshed at call time.

## Why a gateway

The World exposes three tools of its own:

| Tool | What it does |
|---|---|
| `mcp_list_servers` | Server names, transports, connection state and tool counts. |
| `mcp_list_tools` | One server's tools with their input schemas; `refresh` re-reads the catalog. |
| `mcp_call_tool` | Calls one tool with an arguments object and returns its result. |

One tool per server tool would make the bot's tool list depend on which servers happen to be up:
the prefix and the tool table would change without a restart, names would collide across servers,
and every server's schemas would cost context on every turn. The gateway keeps the tool list fixed
and discovers only what a task needs. The connected catalog still enters the prefix, so the model
knows what is available without calling `mcp_list_servers` first.

## Configuration

`worlds.mcp.servers` is a JSON object keyed by server name; each value holds that server's
settings. An empty string means no server.

```json
{
  "files": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp/docs"]
  },
  "issues": {
    "url": "https://mcp.example.com/mcp",
    "headers": { "Authorization": "Bearer ${ISSUES_TOKEN}" }
  }
}
```

| Field | Meaning |
|---|---|
| *(key)* | The routing name in `mcp_call_tool`; 1–40 letters, digits, `_` or `-`. |
| `transport` | `stdio` or `http`; inferred from `command` or `url` when omitted. |
| `command`, `args`, `cwd`, `env` | stdio only. The child inherits the SDK's default environment plus the app's `CORTICO_NODE_EXE` and `CORTICO_PNPM_CJS`, then `env`. |
| `url`, `headers` | http only; Streamable HTTP. |
| `${NAME}` | In any value, reads the deployment secret `NAME` (the deployment `.env` or the process environment). |

A missing secret expands to an empty string and is named in the runtime log.

Other keys sit beside `servers` in `worlds.mcp`, never inside a server entry: `connectTimeoutMs`
(start and tool listing, default 15 s), `callTimeoutMs` (one call, default 60 s), `maxResultChars`
(one receipt, default 20 000). A cold `npx` start can exceed 15 s; raise the first one for such a
server.

Server changes — the list itself, transports, commands — take effect when the World restarts. The
two call-time keys are read per call.

## Behavior

- A server that fails to connect does not stop the World or the other servers; it stays in the lamps
  with its reason, and `mcp_list_servers` reports it.
- A connected server that goes away later pushes one `mcp.server` event with the reason. A stop of
  the World does not.
- `mcp_call_tool` receipts carry the server's text, image and audio content; images and audio become
  attachments when the endpoint accepts them. A result longer than `maxResultChars` is truncated
  with `…[truncated]`.
- `isError` results and transport failures come back as failed receipts with the server's reason.
- The World is disabled by default. Enabling it without a server leaves an empty prompt section and
  the three tools explain what is missing.

## What the model can reach

The model reaches exactly the tools of the configured servers. It cannot add a server, change a
command or read the configuration, and nothing is discovered on its own; reach follows the
configuration. A filesystem server pointed at a drive gives read and write access to that drive, an
HTTP server gives whatever its endpoint offers, a terminal server gives commands. Judge each server
by what its tools can do before adding it.

The package declares the `unsafe` and `internet` market tags for that reason: the reach is the
configuration's, and typical configurations put file access or a web endpoint behind these tools.

## Files

| File | Content |
|---|---|
| `src/definition.ts` | `WorldDefinition`: id, defaults, preflight, `create()`, `describe`. |
| `src/config.ts` | `worlds.mcp` section and the WebUI config group. |
| `src/servers.ts` | JSON validation, defaults and secret expansion. |
| `src/mcp.ts` | One SDK client: connect, catalog, refresh, call, close. |
| `src/result.ts` | MCP content to receipt text and attachments. |
| `src/world.ts` | Tools, event, catalog for the prefix, WebUI declarations. |
| `src/i18n/` | Text people read, eleven languages; `zh` and `en` carry every key. |
| `src/ENV_PROMPT.md` | The environment prompt the model reads. |
| `tests/` | Config parsing and a real stdio MCP server spawned by the tests. |

`pnpm test` and `pnpm typecheck` run against `cortico` from npm; inside the app the framework is the
vendored checkout.

## Dependencies

```bash
corepack pnpm install
```

Run this once in this directory. The package's own `node_modules` is what makes
`@modelcontextprotocol/sdk` resolvable when a deployment loads the World: a local directory is
installed with `link:`, which links the source and installs nothing into it, and Node resolves the
SDK from the source directory's ancestors. A checkout whose dependencies lived in a parent
repository loses them when that repository is reinstalled or moved, and the World then fails with
`Cannot find package '@modelcontextprotocol/sdk'`.

`pnpm-workspace.yaml` makes this directory its own pnpm workspace root, so the command installs here
instead of walking up to a parent checkout.

## License

AGPL-3.0-or-later; the text is in [LICENSE](LICENSE).
