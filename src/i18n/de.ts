import type { McpText } from './index.ts';

const de: McpText = {
  label: 'MCP',

  config: {
    title: 'MCP',
    description: 'Model-Context-Protocol-Server. Wenn aktiviert, werden ihre Werkzeuge über mcp_list_servers, mcp_list_tools und mcp_call_tool erreicht.',
    serversTitle: 'Server',
    serversDescription:
      'Server sind ein Objekt mit dem Servernamen als Schlüssel; jeder Wert enthält die Einstellungen dieses Servers. Ein command macht ihn zu stdio (optional mit args, cwd, env), eine url zu http (optional mit headers); transport darf auch ausdrücklich stehen. ${NAME} in einem Wert liest das Deployment-Geheimnis NAME. Beispiel: {"files":{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/tmp/docs"]}}. Änderungen greifen nach einem Neustart des World.',
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
