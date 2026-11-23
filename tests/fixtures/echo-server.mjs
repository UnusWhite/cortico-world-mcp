/** A real stdio MCP server, spawned by the tests; no network involved. */
import { existsSync } from 'node:fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const gateFile = process.env.FIXTURE_GATE_FILE;
if (gateFile && !existsSync(gateFile)) {
  console.error('gate file missing');
  process.exit(1);
}

const server = new McpServer({ name: 'mcp-world-fixture', version: '0.0.0' });

// A slow first start, for the connect-timeout test.
const startDelay = Number(process.env.FIXTURE_START_DELAY_MS ?? 0);
if (startDelay > 0) await new Promise((resolve) => setTimeout(resolve, startDelay));

server.registerTool(
  'echo',
  {
    description: 'Echo the given text back.',
    inputSchema: { text: z.string().describe('Text to echo.') },
  },
  async ({ text }) => ({ content: [{ type: 'text', text: `echo: ${text}` }] }),
);

server.registerTool(
  'add',
  {
    description: 'Add two numbers.',
    inputSchema: { a: z.number(), b: z.number() },
  },
  async ({ a, b }) => ({
    content: [{ type: 'text', text: `sum: ${a + b}` }],
    structuredContent: { sum: a + b },
  }),
);

server.registerTool(
  'stop',
  { description: 'Stop the server process.' },
  async () => {
    setTimeout(() => process.exit(0), 50);
    return { content: [{ type: 'text', text: 'stopping' }] };
  },
);

await server.connect(new StdioServerTransport());
