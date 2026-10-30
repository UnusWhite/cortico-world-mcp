# Changelog

## 0.1.1

- A stdio server declared as `node` or `corepack` no longer fails with `'""' is not recognized as an
  internal or external command`. Coopanion 0.2.16 puts its `shims/` directory first on `PATH` and
  ships a `node.cmd` there that runs `%CORTICO_NODE_EXE%`; the child now receives that variable and
  `CORTICO_PNPM_CJS`. Servers configured with an absolute interpreter path were not affected.

## 0.1.0

- First release: stdio and Streamable HTTP MCP servers, declared in `worlds.mcp.servers` as an
  object keyed by server name.
- Three tools: `mcp_list_servers`, `mcp_list_tools` (with `refresh`), `mcp_call_tool`.
- Tool discovery at mount, catalog in the environment prompt, one `mcp.server` event per unexpected
  disconnect.
- `${NAME}` secret expansion, bounded connect and call timeouts, receipt truncation, image and audio
  attachments.
