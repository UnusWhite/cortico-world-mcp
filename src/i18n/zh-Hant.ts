import type { McpText } from './index.ts';

const zhHant: McpText = {
  label: 'MCP',

  config: {
    title: 'MCP',
    description: '模型上下文協定伺服器。啟用後，它提供的工具經 mcp_list_servers、mcp_list_tools 與 mcp_call_tool 使用。',
    serversTitle: '伺服器',
    serversDescription:
      '伺服器的 JSON 陣列。每項有 name、transport(stdio 或 http)；stdio 用 command、args、cwd、env，http 用 url、headers。值裡寫 ${NAME} 會讀取部署密鑰 NAME。例：[{"name":"files","transport":"stdio","command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/tmp/docs"]}]。改動在 World 重新啟動後生效。',
    connectTimeoutTitle: '連線逾時',
    connectTimeoutDescription: '一個伺服器啟動並列出工具的最長等待時間，超過就記為連線失敗。',
    callTimeoutTitle: '呼叫逾時',
    callTimeoutDescription: '單次工具呼叫的最長等待時間。',
    maxResultCharsTitle: '回執上限',
    maxResultCharsDescription: '一次工具回執最多交給模型的字元數，更長的部分截斷。',
  },

  promptDoc: {
    title: 'MCP · 環境提示詞',
    description: '系統前綴裡說明 MCP 工具並列出已連線伺服器的那一段。',
    catalog: '此刻已連線的伺服器與它們的工具。',
  },

  lamps: {
    online: (tools) => `已連線，${tools} 個工具`,
    error: (reason) => `連線失敗：${reason}`,
    off: '未連線',
    none: '還沒有設定伺服器。',
  },

  badges: {
    servers: '伺服器',
    tools: '工具',
  },
};

export default zhHant;
