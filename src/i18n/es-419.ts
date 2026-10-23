import type { McpText } from './index.ts';

const es419: McpText = {
  label: 'MCP',

  config: {
    title: 'MCP',
    description: 'Servidores de Model Context Protocol. Mientras está activo, sus herramientas se usan mediante mcp_list_servers, mcp_list_tools y mcp_call_tool.',
    serversTitle: 'Servidores',
    serversDescription:
      'Un arreglo JSON de servidores. Cada entrada tiene name y transport ("stdio" o "http"); stdio usa command, args, cwd y env, http usa url y headers. Escribir ${NAME} en un valor lee el secreto de despliegue NAME. Ejemplo: [{"name":"files","transport":"stdio","command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/tmp/docs"]}]. Los cambios se aplican al reiniciar el World.',
    connectTimeoutTitle: 'Tiempo de conexión',
    connectTimeoutDescription: 'Cuánto tiene un servidor para iniciar y listar sus herramientas antes de marcarse como fallido.',
    callTimeoutTitle: 'Tiempo de llamada',
    callTimeoutDescription: 'Cuánto puede durar una llamada a una herramienta.',
    maxResultCharsTitle: 'Límite de respuesta',
    maxResultCharsDescription: 'Cuántos caracteres como máximo entrega un recibo de herramienta al modelo; el resto se corta.',
  },

  promptDoc: {
    title: 'MCP · Indicación de entorno',
    description: 'La parte del prefijo del sistema que explica las herramientas MCP y lista los servidores conectados.',
    catalog: 'Los servidores conectados y sus herramientas en este momento.',
  },

  lamps: {
    online: (tools) => `Conectado, ${tools} herramienta${tools === 1 ? '' : 's'}`,
    error: (reason) => `Falló: ${reason}`,
    off: 'Sin conexión',
    none: 'Todavía no hay ningún servidor configurado.',
  },

  badges: {
    servers: 'Servidores',
    tools: 'Herramientas',
  },
};

export default es419;
