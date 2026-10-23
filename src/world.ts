/**
 * MCP: one gateway World over the Model Context Protocol servers the deployment configures.
 *
 * The model gets three stable tools (`mcp_list_servers`, `mcp_list_tools`, `mcp_call_tool`) instead of one tool
 * per server tool. Servers come and go, and their tool sets change without a restart of the bot;
 * a fixed tool list keeps the system prefix stable and avoids the name collisions that dynamic
 * tool names would create. Discovery happens at call time, with the catalog also in the prefix.
 */
import { fileURLToPath } from 'node:url';
import type { ToolCallContext, ToolDef, ToolOutcome, World, WorldHost, WorldWebUiDecl } from 'cortico/core/types.ts';
import { MODULE_LAMP_MAX } from 'cortico/core/types.ts';
import type { Language } from 'cortico/core/language.ts';
import { nowIso } from 'cortico/core/util.ts';
import { MCP_ID, mcpConfigGroup, type McpConfigSection } from './config.ts';
import { mcpText } from './i18n/index.ts';
import { McpServer, type McpServerState } from './mcp.ts';
import { formatCallResult } from './result.ts';
import { expandEntry, parseServers, type McpServerEntry } from './servers.ts';

const ENV_PROMPT_FILE = fileURLToPath(new URL('./ENV_PROMPT.md', import.meta.url));

/** How much of the catalog enters the prefix; the rest is one `mcp_list_tools` call away. */
const CATALOG_TOOLS_PER_SERVER = 40;
const CATALOG_MAX_CHARS = 4000;

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const truncate = (text: string, maxChars: number): string =>
  text.length <= maxChars ? text : `${text.slice(0, maxChars)}\n…[truncated]`;

/** The three tools the World always gives; their names never depend on a server. */
export const MCP_TOOL_DECLS: ReadonlyArray<Omit<ToolDef, 'handler'>> = [
  {
    name: 'mcp_list_servers',
    description:
      'List the MCP servers configured for this bot: name, transport, connection state and tool count. Use it when a task may need an external service.',
    tags: ['read', 'snapshot'],
    parameters: { type: 'object', additionalProperties: false, properties: {} },
  },
  {
    name: 'mcp_list_tools',
    description:
      'List the tools an MCP server exposes, with each input schema. Call it before mcp_call_tool; pass refresh when the server may have changed. Omit server to see every connected server.',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        server: { type: 'string', description: 'Server name from mcp_list_servers.' },
        query: { type: 'string', description: 'Keep tools whose name or description contains this text.' },
        detail: { type: 'boolean', default: true, description: 'Include each input schema; false lists names and descriptions only.' },
        refresh: { type: 'boolean', default: false, description: 'Ask the server for its tool list again before answering.' },
      },
    },
  },
  {
    name: 'mcp_call_tool',
    description:
      'Call one tool on an MCP server. arguments must match the input schema mcp_list_tools reports; a failure receipt carries the server\'s reason.',
    tags: ['act'],
    interruptible: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        server: { type: 'string', description: 'Server name from mcp_list_servers.' },
        tool: { type: 'string', description: 'Tool name from mcp_list_tools.' },
        arguments: { type: 'object', description: 'Arguments object for the tool; omit when it takes none.', additionalProperties: true },
      },
      required: ['server', 'tool'],
    },
  },
];

export interface McpWorldOptions {
  /** The live `worlds.mcp` section. */
  cfg: McpConfigSection;
  timezone: string;
  /** Deployment secret by name, for `${NAME}` in server entries. */
  secret: (name: string) => string;
}

export class McpWorld implements World {
  readonly id = MCP_ID;

  private host: WorldHost | null = null;
  private readonly servers: McpServer[] = [];
  private readonly entries: McpServerEntry[] = [];
  private readonly configError: string;
  private stopping = false;

  constructor(private readonly opts: McpWorldOptions) {
    try {
      this.entries = parseServers(opts.cfg.servers);
      this.configError = '';
    } catch (error) {
      this.configError = message(error);
    }
  }

  /** The connected servers' tools, for the prefix; omitted while nothing is connected. */
  envPromptVars(): Record<string, string> | null {
    const connected = this.servers.filter((server) => server.state === 'connected');
    if (connected.length === 0) return null;
    return { 'mcp.catalog': this.catalog(connected) };
  }

  private catalog(servers: readonly McpServer[]): string {
    const lines = servers.map((server) => {
      const names = server.tools.slice(0, CATALOG_TOOLS_PER_SERVER).map((tool) => tool.name);
      const more = server.tools.length > names.length ? `, … ${server.tools.length - names.length} more` : '';
      return `- ${server.entry.name} (${server.entry.transport}) — ${server.tools.length} tool${server.tools.length === 1 ? '' : 's'}: ${names.join(', ') || '(none)'}${more}`;
    });
    return truncate(lines.join('\n'), CATALOG_MAX_CHARS);
  }

  async start(host: WorldHost): Promise<void> {
    this.host = host;
    this.stopping = false;
    this.servers.length = 0;
    if (this.configError) {
      host.log.warn(`MCP 配置无效，未连接任何服务器：${this.configError}`);
      return;
    }
    for (const entry of this.entries) {
      const { entry: resolved, missing } = expandEntry(entry, this.opts.secret);
      if (missing.length) host.log.warn(`MCP server "${entry.name}" 缺少密钥：${missing.join('、')}`);
      this.servers.push(new McpServer(resolved, {
        connectTimeoutMs: this.opts.cfg.connectTimeoutMs,
        onClose: (name, reason) => this.onDisconnect(name, reason),
      }));
    }
    await Promise.all(this.servers.map(async (server) => {
      await server.connect();
      if (server.state === 'error') host.log.warn(`MCP server "${server.entry.name}" 连接失败`, { err: server.error });
    }));
  }

  async stop(): Promise<void> {
    this.stopping = true;
    this.host = null;
    const servers = this.servers.splice(0);
    await Promise.all(servers.map((server) => server.close()));
  }

  /** An unexpected close is the only server change worth waking the bot for. */
  private onDisconnect(name: string, reason: string): void {
    if (this.stopping || !this.host) return;
    const host = this.host;
    host.pushEvent(
      {
        type: 'mcp.server',
        ts: nowIso(this.opts.timezone),
        source: this.id,
        origin: 'internal',
        senderKey: `mcp.${name}`,
        text: `MCP server "${name}" disconnected: ${reason}`,
      },
      { trigger: 'debounce' },
    ).catch((error) => host.log.warn('MCP 断线事件投递失败', { err: String(error) }));
  }

  tools(): ToolDef[] {
    return [
      {
        ...MCP_TOOL_DECLS[0],
        handler: async () => this.serversReceipt(),
      },
      {
        ...MCP_TOOL_DECLS[1],
        handler: async (args) => this.toolsReceipt(args),
      },
      {
        ...MCP_TOOL_DECLS[2],
        handler: async (args, ctx) => this.callReceipt(args, ctx),
      },
    ];
  }

  private serversReceipt(): string {
    if (this.configError) return `[tool failed] MCP is not available: ${this.configError}`;
    if (this.entries.length === 0) {
      return 'No MCP server is configured. Set worlds.mcp.servers in this World\'s settings and enable it again.';
    }
    if (this.servers.length === 0) return '[tool failed] MCP has not started.';

    const connected = this.servers.filter((server) => server.state === 'connected');
    const tools = connected.reduce((sum, server) => sum + server.tools.length, 0);
    const lines = [`MCP servers: ${connected.length} of ${this.servers.length} connected, ${tools} tool${tools === 1 ? '' : 's'}.`];
    for (const server of this.servers) {
      const state = server.state === 'connected'
        ? `connected, ${server.tools.length} tool${server.tools.length === 1 ? '' : 's'}`
        : server.state === 'error'
          ? `failed: ${server.error}`
          : 'not started';
      lines.push(`- ${server.entry.name} (${server.entry.transport}) — ${state}`);
    }
    return lines.join('\n');
  }

  private serverNamed(name: string): McpServer | undefined {
    return this.servers.find((server) => server.entry.name === name);
  }

  private async toolsReceipt(args: Record<string, unknown>): Promise<string> {
    if (this.configError) return `[tool failed] MCP is not available: ${this.configError}`;
    if (this.servers.length === 0) return this.serversReceipt();

    const wanted = typeof args.server === 'string' ? args.server.trim() : '';
    if (wanted) {
      const server = this.serverNamed(wanted);
      if (!server) {
        const names = this.servers.map((item) => item.entry.name).join(', ');
        return `[tool failed] Unknown MCP server "${wanted}". Configured servers: ${names}.`;
      }
    }

    const targets = wanted ? [this.serverNamed(wanted) as McpServer] : this.servers.filter((server) => server.state === 'connected');
    if (targets.length === 0) return this.serversReceipt();

    const notes: string[] = [];
    if (args.refresh === true) {
      for (const server of targets) {
        if (server.state !== 'connected') continue;
        const failure = await server.refresh();
        if (failure) notes.push(`[tool failed] ${server.entry.name}: refresh failed: ${failure}`);
      }
    }

    const detail = args.detail !== false;
    const query = typeof args.query === 'string' ? args.query.trim().toLowerCase() : '';
    const blocks: string[] = [];
    for (const server of targets) {
      const tools = server.tools.filter((tool) =>
        !query || tool.name.toLowerCase().includes(query) || tool.description.toLowerCase().includes(query));
      const heading = `${server.entry.name} (${server.entry.transport}) — ${server.tools.length} tool${server.tools.length === 1 ? '' : 's'}`
        + (server.state === 'connected' ? '' : `, ${server.state === 'error' ? `failed: ${server.error}` : 'not started'}`);
      const lines = [tools.length === 0
        ? `${heading}\n  (no tool${query ? ` matches "${args.query as string}"` : ''})`
        : `${heading}\n${tools.map((tool) => {
          const line = `  ${tool.name}${tool.description ? ` — ${tool.description}` : ''}`;
          return detail ? `${line}\n    ${JSON.stringify(tool.inputSchema)}` : line;
        }).join('\n')}`];
      blocks.push(lines.join('\n'));
    }

    const body = [notes.join('\n'), blocks.join('\n\n')].filter(Boolean).join('\n\n');
    return truncate(body, Math.max(1000, this.opts.cfg.maxResultChars));
  }

  private async callReceipt(args: Record<string, unknown>, ctx: ToolCallContext): Promise<string | ToolOutcome> {
    const fail = (text: string): ToolOutcome => ({ text, failed: true });
    if (this.configError) return fail(`[tool failed] MCP is not available: ${this.configError}`);

    const serverName = typeof args.server === 'string' ? args.server.trim() : '';
    const toolName = typeof args.tool === 'string' ? args.tool.trim() : '';
    if (!serverName || !toolName) return fail('[bad input] server and tool are required; find them with mcp_list_servers and mcp_list_tools.');
    const server = this.serverNamed(serverName);
    if (!server) {
      const names = this.servers.map((item) => item.entry.name).join(', ');
      return fail(`[tool failed] Unknown MCP server "${serverName}". Configured servers: ${names || '(none)'}.`);
    }
    if (!server.tools.some((tool) => tool.name === toolName)) {
      const names = server.tools.map((tool) => tool.name).slice(0, 50).join(', ');
      return fail(`[tool failed] Server "${serverName}" has no tool "${toolName}". Its tools: ${names || '(none)'}.`);
    }

    const rawArgs = args.arguments;
    if (rawArgs !== undefined && rawArgs !== null && (typeof rawArgs !== 'object' || Array.isArray(rawArgs))) {
      return fail('[bad input] arguments must be an object matching the tool input schema.');
    }
    const callArgs = (rawArgs ?? {}) as Record<string, unknown>;

    try {
      const raw = await server.call(toolName, callArgs, {
        timeoutMs: this.opts.cfg.callTimeoutMs,
        ...(ctx.signal ? { signal: ctx.signal } : {}),
      });
      const formatted = formatCallResult(serverName, toolName, raw, this.opts.cfg.maxResultChars);
      return {
        text: formatted.text,
        ...(formatted.blobs.length ? { blobs: formatted.blobs } : {}),
        ...(formatted.failed ? { failed: true as const } : {}),
      };
    } catch (error) {
      if (ctx.signal?.aborted || (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted')))) {
        return fail(`[interrupted] ${serverName}.${toolName}: the call was interrupted; the server may have applied part of it.`);
      }
      const detail = message(error);
      // The SDK validates structuredContent against the tool's outputSchema after the call ran.
      // A mismatch is the server's bug, not a failed action; say so rather than inviting a retry.
      if (/output schema|structured content/i.test(detail)) {
        return fail(`[tool failed] ${serverName}.${toolName}: the server returned a result that does not match its declared output schema; the call may have taken effect. ${detail}`);
      }
      return fail(`[tool failed] ${serverName}.${toolName}: ${detail}`);
    }
  }

  webUi(language: Language = 'zh'): WorldWebUiDecl {
    const t = mcpText(language);
    const views: Array<{ name: string; state: McpServerState; hint: string }> = this.servers.length > 0
      ? this.servers.map((server) => ({
          name: server.entry.name,
          state: server.state,
          hint: server.state === 'connected'
            ? t.lamps.online(server.tools.length)
            : server.state === 'error' ? t.lamps.error(server.error) : t.lamps.off,
        }))
      : this.entries.map((entry) => ({ name: entry.name, state: 'off' as const, hint: t.lamps.off }));

    const lamps = views.length > 0
      ? views.slice(0, MODULE_LAMP_MAX).map((view) => ({
          label: view.name,
          state: view.state === 'connected' ? 'online' as const : view.state === 'error' ? 'error' as const : 'offline' as const,
          hint: view.hint,
        }))
      : [{ label: t.label, state: 'offline' as const, hint: this.configError || t.lamps.none }];

    const connected = this.servers.filter((server) => server.state === 'connected');
    const toolCount = connected.reduce((sum, server) => sum + server.tools.length, 0);

    return {
      label: t.label,
      lamps,
      badges: [
        { label: t.badges.servers, value: `${connected.length}/${this.entries.length}`, tone: connected.length > 0 ? 'on' as const : 'off' as const },
        { label: t.badges.tools, value: toolCount, tone: toolCount > 0 ? 'on' as const : 'off' as const },
      ],
      config: [mcpConfigGroup(language)],
      promptDocs: [{
        key: `worlds.${MCP_ID}.envPrompt`,
        title: t.promptDoc.title,
        description: t.promptDoc.description,
        path: ENV_PROMPT_FILE,
        role: 'envPrompt',
        vars: [{ name: 'mcp.catalog', description: t.promptDoc.catalog, multiline: true }],
      }],
    };
  }
}
