import { describeTools, type WorldDefinition } from 'cortico/world.ts';
import { MCP_DEFAULTS, MCP_ID, type McpConfigSection } from './config.ts';
import { parseServers } from './servers.ts';
import { MCP_TOOL_DECLS, McpWorld } from './world.ts';

export const MCP: WorldDefinition<McpConfigSection> = {
  id: MCP_ID,
  label: 'MCP',
  defaults: () => ({ ...MCP_DEFAULTS }),
  // A malformed section stops activation with the reason, instead of mounting a World that cannot work.
  preflight: (ctx) => { parseServers(ctx.cfg.servers); },
  create: (ctx) => new McpWorld({
    cfg: ctx.cfg,
    timezone: ctx.timezone,
    secret: (name) => ctx.secret(name),
  }),
  describe: {
    tools: describeTools(MCP_TOOL_DECLS, {
      mcp_list_servers: {
        zh: '列出配置的 MCP 服务器、连接状态与工具数量。',
        en: 'Lists the configured MCP servers with their connection state and tool counts.',
      },
      mcp_list_tools: {
        zh: '列出一个 MCP 服务器的工具及每个工具的输入 schema。',
        en: 'Lists an MCP server\'s tools with each input schema.',
      },
      mcp_call_tool: {
        zh: '调用 MCP 服务器上的一个工具，回执是该服务器的输出或失败原因。',
        en: 'Calls one tool on an MCP server; the receipt is its output or its failure reason.',
      },
    }),
    events: [{
      type: 'mcp.server',
      description: {
        zh: '已连接的 MCP 服务器断开，正文带断开原因。',
        en: 'A connected MCP server went away; the text carries the reason.',
      },
      trigger: 'debounce',
    }],
  },
};
