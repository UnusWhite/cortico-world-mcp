import type { McpText } from './index.ts';

const ptBR: McpText = {
  label: 'MCP',

  config: {
    title: 'MCP',
    description: 'Servidores do Model Context Protocol. Enquanto ativado, as ferramentas deles são usadas por mcp_list_servers, mcp_list_tools e mcp_call_tool.',
    serversTitle: 'Servidores',
    serversDescription:
      'Os servidores são um objeto com o nome do servidor como chave; cada valor traz as configurações daquele servidor. Um command o torna stdio (args, cwd e env opcionais), uma url o torna http (headers opcionais); transport também pode ser escrito explicitamente. Escrever ${NAME} em um valor lê o segredo de implantação NAME. Exemplo: {"files":{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/tmp/docs"]}}. As mudanças valem ao reiniciar o World.',
    connectTimeoutTitle: 'Tempo de conexão',
    connectTimeoutDescription: 'Quanto um servidor tem para iniciar e listar as ferramentas antes de ser marcado como falho.',
    callTimeoutTitle: 'Tempo de chamada',
    callTimeoutDescription: 'Quanto uma chamada de ferramenta pode durar.',
    maxResultCharsTitle: 'Limite de resposta',
    maxResultCharsDescription: 'Quantos caracteres no máximo um recibo de ferramenta entrega ao modelo; o restante é cortado.',
  },

  promptDoc: {
    title: 'MCP · Instrução de ambiente',
    description: 'A parte do prefixo do sistema que explica as ferramentas MCP e lista os servidores conectados.',
    catalog: 'Os servidores conectados e suas ferramentas neste momento.',
  },

  lamps: {
    online: (tools) => `Conectado, ${tools} ferramenta${tools === 1 ? '' : 's'}`,
    error: (reason) => `Falhou: ${reason}`,
    off: 'Desconectado',
    none: 'Nenhum servidor configurado ainda.',
  },

  badges: {
    servers: 'Servidores',
    tools: 'Ferramentas',
  },
};

export default ptBR;
