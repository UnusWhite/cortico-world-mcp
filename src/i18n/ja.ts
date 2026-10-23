import type { McpText } from './index.ts';

const ja: McpText = {
  label: 'MCP',

  config: {
    title: 'MCP',
    description: 'Model Context Protocol のサーバー。有効にすると、そのツールを mcp_list_servers、mcp_list_tools、mcp_call_tool から使えます。',
    serversTitle: 'サーバー',
    serversDescription:
      'サーバーはサーバー名をキーにしたオブジェクトです。値にそのサーバーの設定を書きます。command があれば stdio(args、cwd、env は任意)、url があれば http(headers は任意)になり、transport を明示してもかまいません。値に ${NAME} を書くとデプロイのシークレット NAME を読みます。例:{"files":{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/tmp/docs"]}}。変更は World の再起動後に反映されます。',
    connectTimeoutTitle: '接続タイムアウト',
    connectTimeoutDescription: 'サーバーが起動してツールを列挙するまでの待ち時間。超えると接続失敗として扱います。',
    callTimeoutTitle: '呼び出しタイムアウト',
    callTimeoutDescription: '1 回のツール呼び出しの待ち時間。',
    maxResultCharsTitle: '応答の上限',
    maxResultCharsDescription: '1 回のツール応答でモデルに渡す最大文字数。超えた分は切り詰めます。',
  },

  promptDoc: {
    title: 'MCP · 環境プロンプト',
    description: 'システムプレフィックスのうち、MCP のツールと接続中のサーバーを説明する部分。',
    catalog: '現在接続しているサーバーとそのツール。',
  },

  lamps: {
    online: (tools) => `接続済み、ツール ${tools} 個`,
    error: (reason) => `接続失敗:${reason}`,
    off: '未接続',
    none: 'サーバーがまだ設定されていません。',
  },

  badges: {
    servers: 'サーバー',
    tools: 'ツール',
  },
};

export default ja;
