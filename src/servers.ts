/** The `worlds.mcp.servers` object: validation, defaults, and `${SECRET}` expansion. */

export type McpTransport = 'stdio' | 'http';

export interface McpServerEntry {
  /** Routing name in `mcp_call_tool` and receipts; the key in `worlds.mcp.servers`. */
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
 * Parse the object: the key is the server name, the value its settings. An empty string is no
 * server. Every entry is validated; all problems are reported together so one save fixes the whole
 * section.
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
  if (!isObject(parsed)) {
    throw new McpConfigError('worlds.mcp.servers must be a JSON object keyed by server name, such as {"files":{"command":"npx","args":["-y","server"]}}.');
  }

  const entries: McpServerEntry[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const [key, item] of Object.entries(parsed)) {
    const name = key.trim();
    if (!NAME.test(name)) {
      const shown = name ? ` ${JSON.stringify(name.length > 60 ? `${name.slice(0, 60)}…` : name)}` : '';
      problems.push(`Server key${shown} is not a valid name (1–40 letters, digits, "_" or "-").`);
      continue;
    }
    if (seen.has(name)) {
      problems.push(`Duplicate server name "${name}".`);
      continue;
    }
    seen.add(name);
    if (!isObject(item)) {
      problems.push(`Server "${name}" is not an object.`);
      continue;
    }
    // The name is the key; an entry copied from the array shape would lose it silently.
    if ('name' in item) {
      problems.push(`Server "${name}" has a name field; the key is the name.`);
      continue;
    }

    // These are section settings. Accepting them here would silently keep the default timeout.
    for (const setting of ['connectTimeoutMs', 'callTimeoutMs', 'maxResultChars'] as const) {
      if (setting in item) {
        problems.push(`Server "${name}" has ${setting} inside the entry; it belongs in worlds.mcp.${setting}, beside servers.`);
      }
    }

    const kind = item.transport ?? (typeof item.command === 'string' ? 'stdio' : typeof item.url === 'string' ? 'http' : undefined);
    if (kind !== 'stdio' && kind !== 'http') {
      problems.push(`Server "${name}" needs transport "stdio" with a command, or "http" with a url.`);
      continue;
    }

    const args = item.args ?? [];
    if (!Array.isArray(args) || args.some((arg) => typeof arg !== 'string')) {
      problems.push(`Server "${name}" args must be an array of strings.`);
      continue;
    }
    const env = stringMap(item.env);
    if (env === null) {
      problems.push(`Server "${name}" env must be an object of strings.`);
      continue;
    }
    const headers = stringMap(item.headers);
    if (headers === null) {
      problems.push(`Server "${name}" headers must be an object of strings.`);
      continue;
    }

    if (kind === 'stdio') {
      const command = typeof item.command === 'string' ? item.command.trim() : '';
      if (!command) {
        problems.push(`Server "${name}" is stdio but has no command.`);
        continue;
      }
      const cwd = item.cwd;
      if (cwd !== undefined && typeof cwd !== 'string') {
        problems.push(`Server "${name}" cwd must be a string.`);
        continue;
      }
      entries.push({ name, transport: 'stdio', command, args, ...(typeof cwd === 'string' ? { cwd } : {}), env, headers: {} });
      continue;
    }

    const url = typeof item.url === 'string' ? item.url.trim() : '';
    let parsedUrl: URL | null = null;
    try { parsedUrl = url ? new URL(url) : null; } catch { parsedUrl = null; }
    if (!parsedUrl || (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:')) {
      problems.push(`Server "${name}" is http but ${url ? `url ${JSON.stringify(url)}` : 'has no url'} is not an http(s) URL.`);
      continue;
    }
    entries.push({ name, transport: 'http', args: [], env: {}, url, headers });
  }

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
