import type { McpText } from './index.ts';

const it: McpText = {
  label: 'MCP',

  config: {
    title: 'MCP',
    description: 'Server Model Context Protocol. Quando attivo, i loro strumenti si usano tramite mcp_list_servers, mcp_list_tools e mcp_call_tool.',
    serversTitle: 'Server',
    serversDescription:
      'I server sono un oggetto con il nome del server come chiave; ogni valore contiene le impostazioni di quel server. Un command lo rende stdio (con args, cwd, env facoltativi), una url lo rende http (con headers facoltativi); transport si può anche scrivere esplicitamente. Scrivere ${NAME} in un valore legge il segreto di distribuzione NAME. Esempio: {"files":{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/tmp/docs"]}}. Le modifiche valgono dopo il riavvio del World.',
    connectTimeoutTitle: 'Timeout connessione',
    connectTimeoutDescription: 'Quanto un server ha per avviarsi ed elencare i suoi strumenti prima di essere segnato come fallito.',
    callTimeoutTitle: 'Timeout chiamata',
    callTimeoutDescription: 'Quanto può durare una chiamata a uno strumento.',
    maxResultCharsTitle: 'Limite risposta',
    maxResultCharsDescription: 'Quanti caratteri al massimo un esito di strumento dà al modello; il resto viene tagliato.',
  },

  promptDoc: {
    title: 'MCP · Prompt di ambiente',
    description: 'La parte del prefisso di sistema che spiega gli strumenti MCP ed elenca i server connessi.',
    catalog: 'I server connessi e i loro strumenti in questo momento.',
  },

  lamps: {
    online: (tools) => `Connesso, ${tools} strumento${tools === 1 ? '' : 'i'}`,
    error: (reason) => `Non riuscito: ${reason}`,
    off: 'Non connesso',
    none: 'Nessun server configurato.',
  },

  badges: {
    servers: 'Server',
    tools: 'Strumenti',
  },
};

export default it;
