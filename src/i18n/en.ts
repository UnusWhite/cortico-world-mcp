import type { McpText } from './index.ts';

const en: McpText = {
  label: 'MCP',

  config: {
    title: 'MCP',
    description: 'Model Context Protocol servers. While enabled, their tools are reached through mcp_list_servers, mcp_list_tools and mcp_call_tool.',
    serversTitle: 'Servers',
    serversDescription:
      'A JSON array of servers. Each entry has a name, a transport ("stdio" or "http"), and either command/args/cwd/env for stdio or url/headers for http. Write ${NAME} in a value to read the deployment secret NAME. Example: [{"name":"files","transport":"stdio","command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/tmp/docs"]}]. Changes take effect when the World restarts.',
    connectTimeoutTitle: 'Connect timeout',
    connectTimeoutDescription: 'How long one server gets to start and list its tools before it is reported as failed.',
    callTimeoutTitle: 'Call timeout',
    callTimeoutDescription: 'How long one tool call may take.',
    maxResultCharsTitle: 'Receipt limit',
    maxResultCharsDescription: 'The most characters one tool receipt gives the model; longer results are truncated.',
  },

  promptDoc: {
    title: 'MCP · Environment prompt',
    description: 'The part of the system prefix that explains the MCP tools and lists the connected servers.',
    catalog: 'Connected servers and their tools at this moment.',
  },

  lamps: {
    online: (tools) => `Connected, ${tools} tool${tools === 1 ? '' : 's'}`,
    error: (reason) => `Failed: ${reason}`,
    off: 'Not connected',
    none: 'No server is configured yet.',
  },

  badges: {
    servers: 'Servers',
    tools: 'Tools',
  },
};

export default en;
