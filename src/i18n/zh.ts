import type { McpText } from './index.ts';

const zh: McpText = {
  label: 'MCP',

  config: {
    title: 'MCP',
    description: '模型上下文协议服务器。启用后，它提供的工具经 mcp_list_servers、mcp_list_tools 与 mcp_call_tool 使用。',
    serversTitle: '服务器',
    serversDescription:
      '服务器是键值对象：键是服务器名，值是它的设置。有 command 的走 stdio（可带 args、cwd、env），有 url 的走 http（可带 headers），也可以显式写 transport。值里写 ${NAME} 会读取部署密钥 NAME。例：{"files":{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/tmp/docs"]}}。改动在 World 重启后生效。',
    connectTimeoutTitle: '连接超时',
    connectTimeoutDescription: '一个服务器启动并列出工具的最长等待时间，超过就记为连接失败。',
    callTimeoutTitle: '调用超时',
    callTimeoutDescription: '单次工具调用的最长等待时间。',
    maxResultCharsTitle: '回执上限',
    maxResultCharsDescription: '一次工具回执最多交给模型的字符数，更长的部分截断。',
  },

  promptDoc: {
    title: 'MCP · 环境提示词',
    description: '系统前缀里说明 MCP 工具并列出已连接服务器的那一段。',
    catalog: '此刻已连接的服务器与它们的工具。',
  },

  lamps: {
    online: (tools) => `已连接，${tools} 个工具`,
    error: (reason) => `连接失败：${reason}`,
    off: '未连接',
    none: '还没有配置服务器。',
  },

  badges: {
    servers: '服务器',
    tools: '工具',
  },
};

export default zh;
