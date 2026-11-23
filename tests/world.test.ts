import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ToolCallContext, ToolOutcome } from 'cortico/core/types.ts';
import { dryMountWorld } from 'cortico/extensions/dry-mount.ts';
import { MCP_DEFAULTS, type McpConfigSection } from '../src/config.ts';
import { MCP } from '../src/definition.ts';
import { McpWorld } from '../src/world.ts';
import { FakeHost } from './helpers/fake-host.ts';

const FIXTURE = fileURLToPath(new URL('./fixtures/echo-server.mjs', import.meta.url));
const CTX = {} as ToolCallContext;

const config = (servers: string, patch: Partial<McpConfigSection> = {}): McpConfigSection => ({
  ...MCP_DEFAULTS,
  enabled: true,
  servers,
  connectTimeoutMs: 10_000,
  ...patch,
});

const text = (receipt: string | ToolOutcome): string => (typeof receipt === 'string' ? receipt : receipt.text);

const fixtureServers = JSON.stringify({
  fixture: {
    transport: 'stdio',
    command: process.execPath,
    args: [FIXTURE],
  },
});

let scratchDir: string;
let world: McpWorld | null = null;
beforeEach(() => { scratchDir = mkdtempSync(join(tmpdir(), 'mcp-world-')); });
afterEach(async () => {
  await world?.stop();
  world = null;
  rmSync(scratchDir, { recursive: true, force: true });
});

describe('MCP World', () => {
  it('passes a dry mount with the default config', async () => {
    const report = await dryMountWorld(MCP, { scratchDir });
    expect(report.failures).toEqual([]);
    expect(report.ok.join('\n')).toContain('mcp_list_servers, mcp_list_tools, mcp_call_tool');
  });

  it('connects to a stdio server, lists its tools and calls one', async () => {
    world = new McpWorld({ cfg: config(fixtureServers), timezone: 'Asia/Shanghai', secret: () => '' });
    const host = new FakeHost();
    await world.start(host);

    const tools = world.tools();
    expect(tools.map((tool) => tool.name)).toEqual(['mcp_list_servers', 'mcp_list_tools', 'mcp_call_tool']);
    const call = async (name: string) => text(await tools.find((tool) => tool.name === name)!.handler({}, CTX));

    expect(await call('mcp_list_servers')).toContain('fixture (stdio) — connected, 3 tools');
    const listed = await call('mcp_list_tools');
    expect(listed).toContain('echo — Echo the given text back.');
    expect(listed).toContain('"text"');

    const echoed = tools.find((tool) => tool.name === 'mcp_call_tool')!.handler(
      { server: 'fixture', tool: 'echo', arguments: { text: 'hi' } }, CTX,
    );
    expect(text(await echoed)).toContain('echo: hi');

    const added = await tools.find((tool) => tool.name === 'mcp_call_tool')!.handler(
      { server: 'fixture', tool: 'add', arguments: { a: 1, b: 2 } }, CTX,
    );
    const addedText = text(added);
    expect(addedText).toContain('sum: 3');
    expect(addedText).toContain('structuredContent');
  });

  it('puts the connected catalog in the prefix', async () => {
    world = new McpWorld({ cfg: config(fixtureServers), timezone: 'Asia/Shanghai', secret: () => '' });
    expect(world.envPromptVars()).toBeNull();
    await world.start(new FakeHost());
    const vars = world.envPromptVars();
    expect(vars?.['mcp.catalog']).toContain('- fixture (stdio) — 3 tools: echo, add, stop');
  });

  it('pushes one mcp.server event when a connected server goes away', async () => {
    world = new McpWorld({ cfg: config(fixtureServers), timezone: 'Asia/Shanghai', secret: () => '' });
    const host = new FakeHost();
    await world.start(host);
    await world.tools().find((tool) => tool.name === 'mcp_call_tool')!.handler(
      { server: 'fixture', tool: 'stop' }, CTX,
    );
    await expect.poll(() => host.events.filter((event) => event.type === 'mcp.server').length, { timeout: 5000 }).toBe(1);
    const event = host.events.find((item) => item.type === 'mcp.server')!;
    expect(event.origin).toBe('internal');
    expect(event.text).toContain('MCP server "fixture" disconnected');
  });

  it('reports an unknown tool with the server\'s own list', async () => {
    world = new McpWorld({ cfg: config(fixtureServers), timezone: 'Asia/Shanghai', secret: () => '' });
    await world.start(new FakeHost());
    const receipt = await world.tools().find((tool) => tool.name === 'mcp_call_tool')!.handler(
      { server: 'fixture', tool: 'missing' }, CTX,
    ) as ToolOutcome;
    expect(receipt.failed).toBe(true);
    expect(receipt.text).toContain('has no tool "missing"');
    expect(receipt.text).toContain('echo');
  });

  it('keeps a failed server as a lamp and a failed receipt', async () => {
    const broken = JSON.stringify({
      broken: {
        transport: 'stdio',
        command: process.execPath,
        args: ['-e', 'process.exit(1)'],
      },
    });
    world = new McpWorld({ cfg: config(broken, { connectTimeoutMs: 5000 }), timezone: 'Asia/Shanghai', secret: () => '' });
    const host = new FakeHost();
    await world.start(host);

    const receipt = text(await world.tools().find((tool) => tool.name === 'mcp_list_servers')!.handler({}, CTX) as string);
    expect(receipt).toContain('broken (stdio) — failed:');
    const lamp = world.webUi('en').lamps?.[0];
    expect(lamp?.state).toBe('error');
    expect(lamp?.hint).toContain('Failed:');
    expect(world.envPromptVars()).toBeNull();
  });

  it('reports a connect timeout as the timeout, not as a closed connection', async () => {
    const slow = JSON.stringify({
      slow: {
        transport: 'stdio',
        command: process.execPath,
        args: [FIXTURE],
        env: { FIXTURE_START_DELAY_MS: '1500' },
      },
    });
    world = new McpWorld({ cfg: config(slow, { connectTimeoutMs: 500 }), timezone: 'Asia/Shanghai', secret: () => '' });
    await world.start(new FakeHost());

    const receipt = text(await world.tools().find((tool) => tool.name === 'mcp_list_servers')!.handler({}, CTX) as string);
    expect(receipt).toContain('connect timed out');
    expect(receipt).toContain('worlds.mcp.connectTimeoutMs');
    expect(receipt).not.toContain('connection closed');
  });

  it('turns invalid config into a failed receipt instead of throwing from create()', async () => {
    world = new McpWorld({ cfg: config('{"x":{}}'), timezone: 'Asia/Shanghai', secret: () => '' });
    await world.start(new FakeHost());
    const receipt = text(await world.tools().find((tool) => tool.name === 'mcp_list_servers')!.handler({}, CTX) as string);
    expect(receipt).toContain('[tool failed] MCP is not available');
    expect(world.webUi('zh').lamps?.[0].state).toBe('offline');
  });

  it('labels the page from the request language', () => {
    world = new McpWorld({ cfg: config(''), timezone: 'Asia/Shanghai', secret: () => '' });
    expect(world.webUi('zh').label).toBe('MCP');
    expect(world.webUi('en').lamps?.[0].hint).toBe('No server is configured yet.');
    expect(world.webUi('ja').badges?.[0].label).toBe('サーバー');
  });

  it('retries failed startup in the background until the server becomes available', async () => {
    const gateFile = join(scratchDir, 'ready');
    const gated = JSON.stringify({
      gated: {
        transport: 'stdio',
        command: process.execPath,
        args: [FIXTURE],
        env: { FIXTURE_GATE_FILE: gateFile },
      },
    });
    world = new McpWorld({
      cfg: config(gated, { connectTimeoutMs: 5000 }),
      timezone: 'Asia/Shanghai',
      secret: () => '',
      retryInitialMs: 50,
      retryMaxMs: 200,
    });
    await world.start(new FakeHost());

    expect(world.webUi('en').lamps?.[0].state).toBe('error');
    expect(world.envPromptVars()).toBeNull();

    writeFileSync(gateFile, 'ready');

    await expect.poll(() => world?.webUi('en').lamps?.[0].state, { timeout: 5000 }).toBe('online');
    expect(world.envPromptVars()?.['mcp.catalog']).toContain('- gated (stdio) — 3 tools:');

    const echoed = await world.tools().find((tool) => tool.name === 'mcp_call_tool')!.handler(
      { server: 'gated', tool: 'echo', arguments: { text: 'back' } }, CTX,
    );
    expect(text(echoed)).toContain('echo: back');
  });

  it('reconnects automatically after an unexpected disconnect', async () => {
    world = new McpWorld({
      cfg: config(fixtureServers),
      timezone: 'Asia/Shanghai',
      secret: () => '',
      retryInitialMs: 50,
      retryMaxMs: 200,
    });
    const host = new FakeHost();
    await world.start(host);

    await world.tools().find((tool) => tool.name === 'mcp_call_tool')!.handler(
      { server: 'fixture', tool: 'stop' }, CTX,
    );
    await expect.poll(() => host.events.filter((event) => event.type === 'mcp.server').length, { timeout: 5000 }).toBe(1);
    await expect.poll(() => world?.webUi('en').lamps?.[0].state, { timeout: 5000 }).toBe('online');

    const echoed = await world.tools().find((tool) => tool.name === 'mcp_call_tool')!.handler(
      { server: 'fixture', tool: 'echo', arguments: { text: 'again' } }, CTX,
    );
    expect(text(echoed)).toContain('echo: again');
  });

  it('reconnects errored servers on demand via mcp_list_tools and mcp_call_tool', async () => {
    const gateA = join(scratchDir, 'gate-a');
    const gateB = join(scratchDir, 'gate-b');
    const gateC = join(scratchDir, 'gate-c');
    const servers = JSON.stringify({
      alpha: { transport: 'stdio', command: process.execPath, args: [FIXTURE], env: { FIXTURE_GATE_FILE: gateA } },
      beta: { transport: 'stdio', command: process.execPath, args: [FIXTURE], env: { FIXTURE_GATE_FILE: gateB } },
      gamma: { transport: 'stdio', command: process.execPath, args: [FIXTURE], env: { FIXTURE_GATE_FILE: gateC } },
    });
    world = new McpWorld({
      cfg: config(servers, { connectTimeoutMs: 5000 }),
      timezone: 'Asia/Shanghai',
      secret: () => '',
      retryInitialMs: 60_000,
      retryMaxMs: 60_000,
    });
    await world.start(new FakeHost());

    const listTools = world.tools().find((tool) => tool.name === 'mcp_list_tools')!;
    const callTool = world.tools().find((tool) => tool.name === 'mcp_call_tool')!;

    // 1. Named server in mcp_list_tools
    writeFileSync(gateA, 'ready');
    const listedAlpha = text(await listTools.handler({ server: 'alpha' }, CTX));
    expect(listedAlpha).toContain('alpha (stdio) — 3 tools');
    expect(listedAlpha).toContain('echo');

    // 2. refresh: true across all servers
    writeFileSync(gateB, 'ready');
    const listedAll = text(await listTools.handler({ refresh: true }, CTX));
    expect(listedAll).toContain('alpha (stdio) — 3 tools');
    expect(listedAll).toContain('beta (stdio) — 3 tools');

    // 3. Direct mcp_call_tool
    writeFileSync(gateC, 'ready');
    const calledGamma = text(await callTool.handler(
      { server: 'gamma', tool: 'echo', arguments: { text: 'ondemand' } }, CTX,
    ));
    expect(calledGamma).toContain('echo: ondemand');
  });

  it('cancels pending retry timers on stop()', async () => {
    const gateFile = join(scratchDir, 'stopped-gate');
    const gated = JSON.stringify({
      gated: {
        transport: 'stdio',
        command: process.execPath,
        args: [FIXTURE],
        env: { FIXTURE_GATE_FILE: gateFile },
      },
    });
    world = new McpWorld({
      cfg: config(gated, { connectTimeoutMs: 5000 }),
      timezone: 'Asia/Shanghai',
      secret: () => '',
      retryInitialMs: 50,
      retryMaxMs: 50,
    });
    await world.start(new FakeHost());
    expect(world.webUi('en').lamps?.[0].state).toBe('error');

    await world.stop();
    writeFileSync(gateFile, 'ready');
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(world.webUi('en').lamps?.[0].state).toBe('offline');
    expect(world.envPromptVars()).toBeNull();
  });
});
