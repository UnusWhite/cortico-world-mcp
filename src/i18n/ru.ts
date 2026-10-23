import type { McpText } from './index.ts';

const ru: McpText = {
  label: 'MCP',

  config: {
    title: 'MCP',
    description: 'Серверы Model Context Protocol. Пока включено, их инструменты доступны через mcp_list_servers, mcp_list_tools и mcp_call_tool.',
    serversTitle: 'Серверы',
    serversDescription:
      'JSON-массив серверов. У каждой записи есть name и transport ("stdio" или "http"); для stdio — command, args, cwd, env, для http — url, headers. Запись ${NAME} в значении читает секрет развёртывания NAME. Пример: [{"name":"files","transport":"stdio","command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/tmp/docs"]}]. Изменения вступают в силу после перезапуска World.',
    connectTimeoutTitle: 'Тайм-аут подключения',
    connectTimeoutDescription: 'Сколько серверу даётся на запуск и перечисление инструментов, прежде чем он будет помечен как недоступный.',
    callTimeoutTitle: 'Тайм-аут вызова',
    callTimeoutDescription: 'Сколько может длиться один вызов инструмента.',
    maxResultCharsTitle: 'Лимит ответа',
    maxResultCharsDescription: 'Сколько символов один отчёт инструмента отдаёт модели; остальное обрезается.',
  },

  promptDoc: {
    title: 'MCP · Подсказка окружения',
    description: 'Часть системного префикса, которая объясняет инструменты MCP и перечисляет подключённые серверы.',
    catalog: 'Подключённые сейчас серверы и их инструменты.',
  },

  lamps: {
    online: (tools) => `Подключено, инструментов: ${tools}`,
    error: (reason) => `Ошибка: ${reason}`,
    off: 'Не подключено',
    none: 'Серверы ещё не настроены.',
  },

  badges: {
    servers: 'Серверы',
    tools: 'Инструменты',
  },
};

export default ru;
