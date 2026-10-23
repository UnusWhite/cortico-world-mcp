import type { McpText } from './index.ts';

const es419: McpText = {
  label: 'MCP',

  config: {
    title: 'MCP',
    description: 'Servidores de Model Context Protocol. Mientras está activo, sus herramientas se usan mediante mcp_list_servers, mcp_list_tools y mcp_call_tool.',
    serversTitle: 'Servidores',
    serversDescription:
      'Los servidores son un objeto con el nombre del servidor como clave; cada valor tiene la configuración de ese servidor. Un command lo hace stdio (con args, cwd y env opcionales), una url lo hace http (con headers opcionales); también se puede escribir transport explícitamente. Escribir ${NAME} en un valor lee el secreto de despliegue NAME. Ejemplo: {"files":{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/tmp/docs"]}}. Los cambios se aplican al reiniciar el World.',
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
