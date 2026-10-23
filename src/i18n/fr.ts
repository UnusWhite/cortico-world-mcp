import type { McpText } from './index.ts';

const fr: McpText = {
  label: 'MCP',

  config: {
    title: 'MCP',
    description: 'Serveurs Model Context Protocol. Une fois activé, leurs outils passent par mcp_list_servers, mcp_list_tools et mcp_call_tool.',
    serversTitle: 'Serveurs',
    serversDescription:
      'Les serveurs forment un objet dont la clé est le nom du serveur ; chaque valeur porte les réglages de ce serveur. Un command en fait un serveur stdio (args, cwd, env facultatifs), une url un serveur http (headers facultatifs) ; transport peut aussi être écrit explicitement. Écrire ${NAME} dans une valeur lit le secret de déploiement NAME. Exemple : {"files":{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/tmp/docs"]}}. Les modifications prennent effet au redémarrage du World.',
    connectTimeoutTitle: 'Délai de connexion',
    connectTimeoutDescription: 'Temps accordé à un serveur pour démarrer et lister ses outils avant d’être signalé en échec.',
    callTimeoutTitle: 'Délai d’appel',
    callTimeoutDescription: 'Temps maximal d’un appel d’outil.',
    maxResultCharsTitle: 'Limite de réponse',
    maxResultCharsDescription: 'Nombre maximal de caractères qu’un reçu d’outil donne au modèle ; le reste est coupé.',
  },

  promptDoc: {
    title: 'MCP · Invite d’environnement',
    description: 'La partie du préfixe système qui décrit les outils MCP et liste les serveurs connectés.',
    catalog: 'Les serveurs connectés et leurs outils à cet instant.',
  },

  lamps: {
    online: (tools) => `Connecté, ${tools} outil${tools === 1 ? '' : 's'}`,
    error: (reason) => `Échec : ${reason}`,
    off: 'Non connecté',
    none: 'Aucun serveur n’est encore configuré.',
  },

  badges: {
    servers: 'Serveurs',
    tools: 'Outils',
  },
};

export default fr;
