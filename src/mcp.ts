/**
 * One MCP server connection. The SDK owns the wire protocol; this file owns the lifecycle the
 * World needs: a bounded connect, a tool catalog, a bounded call, and a code that reports an
 * unexpected close once.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { getDefaultEnvironment, StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { McpServerEntry } from './servers.ts';

export interface McpToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type McpServerState = 'off' | 'connected' | 'error';

export interface McpServerOptions {
  connectTimeoutMs: number;
  /** Called only for a close after a successful connect; the World turns it into an event. */
  onClose: (name: string, reason: string) => void;
}

const CLIENT_INFO = { name: 'cortico-mcp', version: '0.1.1' };
const CLOSE_TIMEOUT_MS = 2000;
const STDERR_TAIL_MAX = 4000;

/**
 * Paths the app's command shims need. A Coopanion build puts `shims/` first on PATH and ships
 * `node.cmd` there, which runs `%CORTICO_NODE_EXE%`; the SDK's default environment is a whitelist
 * that leaves that variable out, so the shim expands to an empty command and cmd reports `""`.
 */
const APP_SHIM_ENV = ['CORTICO_NODE_EXE', 'CORTICO_PNPM_CJS'] as const;

/**
 * The child's environment: the SDK's default whitelist plus the app's own executable paths, then
 * whatever the server entry declares. Neither path is a secret; they are the app's install locations.
 */
export function childEnvironment(extra: Record<string, string> = {}): Record<string, string> {
  const env = getDefaultEnvironment();
  for (const name of APP_SHIM_ENV) {
    const value = process.env[name];
    if (value) env[name] = value;
  }
  return { ...env, ...extra };
}

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Resolve or reject after `ms`; the timer is always cleared. */
async function withTimeout<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} after ${Math.round(ms / 1000)}s`)), ms);
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** A schema the providers accept: an object, without the dialect marker some servers add. */
function normalizeSchema(schema: unknown): Record<string, unknown> {
  if (typeof schema !== 'object' || schema === null || Array.isArray(schema)) {
    return { type: 'object', properties: {} };
  }
  const { $schema: _schema, ...rest } = schema as Record<string, unknown>;
  return { type: 'object', properties: {}, ...rest };
}

export class McpServer {
  state: McpServerState = 'off';
  /** Why the last connect or call failed; empty while connected. */
  error = '';
  tools: McpToolInfo[] = [];

  private client: Client | null = null;
  private transport: Transport | null = null;
  private closing = false;
  private stderrTail = '';
  /** Errors the SDK reports on the client side, kept apart from the server's own stderr. */
  private clientErrorTail = '';

  constructor(readonly entry: McpServerEntry, private readonly opts: McpServerOptions) {}

  private makeTransport(): Transport {
    if (this.entry.transport === 'http') {
      return new StreamableHTTPClientTransport(new URL(this.entry.url as string), {
        requestInit: { headers: this.entry.headers },
      });
    }
    const transport = new StdioClientTransport({
      command: this.entry.command as string,
      args: this.entry.args,
      ...(this.entry.cwd ? { cwd: this.entry.cwd } : {}),
      env: childEnvironment(this.entry.env),
      stderr: 'pipe',
    });
    transport.stderr?.on('data', (chunk: unknown) => {
      this.noteStderr(String(chunk));
    });
    return transport;
  }

  /** Keep the end of stderr; a server that dies explains itself there, not in the SDK error. */
  private noteStderr(line: string): void {
    const next = this.stderrTail + line;
    this.stderrTail = next.length > STDERR_TAIL_MAX ? next.slice(next.length - STDERR_TAIL_MAX) : next;
  }

  private stderrSuffix(): string {
    const tail = this.stderrTail.trim();
    return tail ? ` (stderr: ${tail.slice(-600)})` : '';
  }

  private clientErrorSuffix(): string {
    const tail = this.clientErrorTail.trim();
    return tail ? ` (client: ${tail.slice(-400)})` : '';
  }

  /**
   * An unexpected close is the only one the operator hears about, and it never replaces an error the
   * connect already recorded: a timed-out connect closes its own transport, and "connection closed"
   * there would hide the timeout that caused it.
   */
  private handleClosed(reason: string): void {
    if (this.closing) return;
    const wasConnected = this.state === 'connected';
    if (wasConnected) {
      this.state = 'error';
      this.error = reason;
      this.opts.onClose(this.entry.name, reason);
    } else if (this.state !== 'error') {
      this.state = 'error';
      this.error = reason;
    }
  }

  async connect(): Promise<void> {
    this.closing = false;
    this.stderrTail = '';
    this.clientErrorTail = '';
    try {
      const transport = this.makeTransport();
      const client = new Client(CLIENT_INFO);
      client.onerror = (error) => {
        const next = this.clientErrorTail + error.message;
        this.clientErrorTail = next.length > STDERR_TAIL_MAX ? next.slice(next.length - STDERR_TAIL_MAX) : next;
      };
      client.onclose = () => {
        this.handleClosed(`connection closed${this.stderrSuffix()}${this.clientErrorSuffix()}`);
      };
      this.transport = transport;
      this.client = client;
      await withTimeout(
        client.connect(transport, { timeout: this.opts.connectTimeoutMs }),
        this.opts.connectTimeoutMs,
        'connect timed out',
      );
      this.tools = await this.listAll();
      this.state = 'connected';
      this.error = '';
    } catch (error) {
      const detail = message(error);
      const hint = /timed out/.test(detail)
        ? '; raise worlds.mcp.connectTimeoutMs if the server\'s first start is slow (npx may download it)'
        : '';
      this.state = 'error';
      this.error = `${detail}${hint}${this.stderrSuffix()}${this.clientErrorSuffix()}`;
      this.tools = [];
      await this.dispose();
    }
  }

  /** Re-read the catalog on a live connection; a failure leaves the old catalog and returns the reason. */
  async refresh(): Promise<string | null> {
    if (!this.client || this.state !== 'connected') return this.error || 'not connected';
    try {
      this.tools = await this.listAll();
      return null;
    } catch (error) {
      return message(error);
    }
  }

  private async listAll(): Promise<McpToolInfo[]> {
    if (!this.client) throw new Error('not connected');
    const tools: McpToolInfo[] = [];
    let cursor: string | undefined;
    // 50 pages is far beyond any real server; the bound only stops a misbehaving one.
    for (let page = 0; page < 50; page++) {
      const result = await this.client.listTools(cursor ? { cursor } : undefined, {
        timeout: this.opts.connectTimeoutMs,
      });
      for (const tool of result.tools) {
        tools.push({
          name: tool.name,
          description: tool.description ?? '',
          inputSchema: normalizeSchema(tool.inputSchema),
        });
      }
      cursor = result.nextCursor;
      if (!cursor) break;
    }
    return tools;
  }

  /** Call a tool; the result is the SDK's raw call result, formatted by the World. */
  async call(name: string, args: Record<string, unknown>, opts: { timeoutMs: number; signal?: AbortSignal }): Promise<unknown> {
    if (!this.client || this.state !== 'connected') throw new Error(this.error || 'not connected');
    return this.client.callTool({ name, arguments: args }, undefined, {
      timeout: opts.timeoutMs,
      ...(opts.signal ? { signal: opts.signal } : {}),
    });
  }

  private async dispose(): Promise<void> {
    const client = this.client;
    this.client = null;
    this.transport = null;
    if (!client) return;
    try {
      await withTimeout(client.close(), CLOSE_TIMEOUT_MS, 'close timed out');
    } catch {
      // The process may already be gone; the connection is unusable either way.
    }
  }

  async close(): Promise<void> {
    this.closing = true;
    this.state = 'off';
    await this.dispose();
  }
}
