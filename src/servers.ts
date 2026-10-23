/** The `worlds.mcp.servers` JSON array: validation, defaults, and `${SECRET}` expansion. */

export type McpTransport = 'stdio' | 'http';

export interface McpServerEntry {
  /** Routing name in `mcp_call_tool` and receipts. */
  name: string;
  transport: McpTransport;
  /** stdio */
  command?: string;
  args: string[];
  cwd?: string;
  env: Record<string, string>;
  /** http */
  url?: string;
  headers: Record<string, string>;
}

/** A configuration problem for the operator, not for the model. */
export class McpConfigError extends Error {}

const NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stringMap = (value: unknown): Record<string, string> | null => {
  if (value === undefined) return {};
  if (!isObject(value)) return null;
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== 'string') return null;
    out[key] = item;
  }
  return out;
};

/**
 * Parse the JSON array. An empty string is no server. Every entry is validated; all problems are
 * reported together so one save fixes the whole section.
 */
export function parseServers(raw: string): McpServerEntry[] {
  const source = (raw ?? '').trim();
  if (!source) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    throw new McpConfigError(`worlds.mcp.servers is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!Array.isArray(parsed)) throw new McpConfigError('worlds.mcp.servers must be a JSON array of servers.');

  const entries: McpServerEntry[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();

  parsed.forEach((item, index) => {
    const where = `Entry ${index + 1}`;
    if (!isObject(item)) {
      problems.push(`${where} is not an object.`);
      return;
    }
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (!NAME.test(name)) {
      const shown = name ? ` ${JSON.stringify(name.length > 60 ? `${name.slice(0, 60)}…` : name)}` : '';
      problems.push(`${where} has no valid name${shown} (1–40 letters, digits, "_" or "-").`);
      return;
    }
    if (seen.has(name)) {
      problems.push(`Duplicate server name "${name}".`);
      return;
    }
    seen.add(name);

    // These are section settings. Accepting them here would silently keep the default timeout.
    for (const key of ['connectTimeoutMs', 'callTimeoutMs', 'maxResultChars'] as const) {
      if (key in item) {
        problems.push(`${where} ("${name}") has ${key} inside the server entry; it belongs in worlds.mcp.${key}, beside servers.`);
      }
    }

    const kind = item.transport ?? (typeof item.command === 'string' ? 'stdio' : typeof item.url === 'string' ? 'http' : undefined);
    if (kind !== 'stdio' && kind !== 'http') {
      problems.push(`${where} ("${name}") needs transport "stdio" with a command, or "http" with a url.`);
      return;
    }

    const args = item.args ?? [];
    if (!Array.isArray(args) || args.some((arg) => typeof arg !== 'string')) {
      problems.push(`${where} ("${name}") args must be an array of strings.`);
      return;
    }
    const env = stringMap(item.env);
    if (env === null) {
      problems.push(`${where} ("${name}") env must be an object of strings.`);
      return;
    }
    const headers = stringMap(item.headers);
    if (headers === null) {
      problems.push(`${where} ("${name}") headers must be an object of strings.`);
      return;
    }

    if (kind === 'stdio') {
      const command = typeof item.command === 'string' ? item.command.trim() : '';
      if (!command) {
        problems.push(`${where} ("${name}") is stdio but has no command.`);
        return;
      }
      const cwd = item.cwd;
      if (cwd !== undefined && typeof cwd !== 'string') {
        problems.push(`${where} ("${name}") cwd must be a string.`);
        return;
      }
      entries.push({ name, transport: 'stdio', command, args, ...(typeof cwd === 'string' ? { cwd } : {}), env, headers: {} });
      return;
    }

    const url = typeof item.url === 'string' ? item.url.trim() : '';
    let parsedUrl: URL | null = null;
    try { parsedUrl = url ? new URL(url) : null; } catch { parsedUrl = null; }
    if (!parsedUrl || (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:')) {
      problems.push(`${where} ("${name}") is http but ${url ? `url ${JSON.stringify(url)}` : 'has no url'} is not an http(s) URL.`);
      return;
    }
    entries.push({ name, transport: 'http', args: [], env: {}, url, headers });
  });

  if (problems.length) throw new McpConfigError(problems.join(' '));
  return entries;
}

const SECRET_REF = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

/** `${NAME}` in any string field reads the deployment secret NAME; a missing one becomes "". */
export function expandEntry(
  entry: McpServerEntry,
  secret: (name: string) => string,
): { entry: McpServerEntry; missing: string[] } {
  const missing = new Set<string>();
  const expand = (value: string): string =>
    value.replace(SECRET_REF, (_match, name: string) => {
      const resolved = secret(name);
      if (!resolved) missing.add(name);
      return resolved;
    });

  const map: Record<string, string> = {};
  for (const [key, value] of Object.entries(entry.env)) map[key] = expand(value);
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(entry.headers)) headers[key] = expand(value);

  return {
    entry: {
      ...entry,
      ...(entry.command ? { command: expand(entry.command) } : {}),
      args: entry.args.map(expand),
      ...(entry.cwd ? { cwd: expand(entry.cwd) } : {}),
      env: map,
      ...(entry.url ? { url: expand(entry.url) } : {}),
      headers,
    },
    missing: [...missing],
  };
}
