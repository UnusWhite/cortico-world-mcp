import type { McpText } from './index.ts';

const de: McpText = {
  label: 'MCP',

  config: {
    title: 'MCP',
    description: 'Model-Context-Protocol-Server. Wenn aktiviert, werden ihre Werkzeuge über mcp_list_servers, mcp_list_tools und mcp_call_tool erreicht.',
    serversTitle: 'Server',
    serversDescription:
      'Ein JSON-Array von Servern. Jeder Eintrag hat name und transport ("stdio" oder "http"); bei stdio command, args, cwd, env, bei http url, headers. ${NAME} in einem Wert liest das Deployment-Geheimnis NAME. Beispiel: [{"name":"files","transport":"stdio","command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/tmp/docs"]}]. Änderungen greifen nach einem Neustart des World.',
    connectTimeoutTitle: 'Verbindungszeitlimit',
    connectTimeoutDescription: 'Wie lange ein Server zum Starten und Auflisten seiner Werkzeuge hat, bevor er als fehlgeschlagen gilt.',
    callTimeoutTitle: 'Aufrufzeitlimit',
    callTimeoutDescription: 'Wie lange ein Werkzeugaufruf dauern darf.',
    maxResultCharsTitle: 'Antwortlimit',
    maxResultCharsDescription: 'Wie viele Zeichen eine Werkzeugantwort dem Modell höchstens liefert; längere werden gekürzt.',
  },

  promptDoc: {
    title: 'MCP · Umgebungs-Prompt',
    description: 'Der Teil des Systempräfixes, der die MCP-Werkzeuge erklärt und die verbundenen Server auflistet.',
    catalog: 'Die verbundenen Server und ihre Werkzeuge in diesem Moment.',
  },

  lamps: {
    online: (tools) => `Verbunden, ${tools} Werkzeug${tools === 1 ? '' : 'e'}`,
    error: (reason) => `Fehlgeschlagen: ${reason}`,
    off: 'Nicht verbunden',
    none: 'Noch kein Server konfiguriert.',
  },

  badges: {
    servers: 'Server',
    tools: 'Werkzeuge',
  },
};

export default de;
