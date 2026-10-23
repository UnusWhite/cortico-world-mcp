# Changelog

## 0.1.0

- First release: stdio and Streamable HTTP MCP servers, validated through `worlds.mcp.servers`.
- Three tools: `mcp_list_servers`, `mcp_list_tools` (with `refresh`), `mcp_call_tool`.
- Tool discovery at mount, catalog in the environment prompt, one `mcp.server` event per unexpected
  disconnect.
- `${NAME}` secret expansion, bounded connect and call timeouts, receipt truncation, image and audio
  attachments.
