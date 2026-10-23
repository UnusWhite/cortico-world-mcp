import { describe, expect, it } from 'vitest';
import { expandEntry, McpConfigError, parseServers } from '../src/servers.ts';

describe('worlds.mcp.servers', () => {
  it('treats an empty string as no server', () => {
    expect(parseServers('')).toEqual([]);
    expect(parseServers('   ')).toEqual([]);
  });

  it('defaults the transport from command or url', () => {
    const [stdio, http] = parseServers(JSON.stringify([
      { name: 'files', command: 'npx', args: ['-y', 'server'] },
      { name: 'docs', url: 'https://example.test/mcp' },
    ]));
    expect(stdio).toMatchObject({ name: 'files', transport: 'stdio', args: ['-y', 'server'], env: {} });
    expect(http).toMatchObject({ name: 'docs', transport: 'http', headers: {} });
  });

  it('reports every bad entry in one error', () => {
    const raw = JSON.stringify([
      { name: 'no-command' },
      { name: 'bad name!' },
      { name: 'bad-url', transport: 'http', url: 'ftp://example.test' },
      { name: 'ok', command: 'node' },
      { name: 'ok', command: 'node' },
    ]);
    expect(() => parseServers(raw)).toThrow(McpConfigError);
    try {
      parseServers(raw);
    } catch (error) {
      const text = (error as Error).message;
      expect(text).toContain('no-command');
      expect(text).toContain('bad name!');
      expect(text).toContain('ftp://example.test');
      expect(text).toContain('Duplicate server name "ok"');
    }
  });

  it('rejects a non-array and invalid JSON', () => {
    expect(() => parseServers('{}')).toThrow(/must be a JSON array/);
    expect(() => parseServers('[')).toThrow(/not valid JSON/);
  });

  it('rejects section settings placed inside a server entry', () => {
    const raw = JSON.stringify([{ name: 'files', command: 'node', connectTimeoutMs: 60_000 }]);
    expect(() => parseServers(raw)).toThrow(/worlds\.mcp\.connectTimeoutMs/);
  });
});

describe('secret expansion', () => {
  const entry = {
    name: 'github',
    transport: 'stdio' as const,
    command: 'node',
    args: ['--token', '${GITHUB_TOKEN}'],
    env: { TOKEN: '${GITHUB_TOKEN}', LITERAL: 'plain' },
    headers: {},
  };

  it('reads ${NAME} from the deployment secrets', () => {
    const { entry: resolved, missing } = expandEntry(entry, (name) => (name === 'GITHUB_TOKEN' ? 's3cret' : ''));
    expect(resolved.args).toEqual(['--token', 's3cret']);
    expect(resolved.env).toEqual({ TOKEN: 's3cret', LITERAL: 'plain' });
    expect(missing).toEqual([]);
  });

  it('names the secrets that were not found', () => {
    const { entry: resolved, missing } = expandEntry(entry, () => '');
    expect(resolved.env.TOKEN).toBe('');
    expect(missing).toEqual(['GITHUB_TOKEN']);
  });
});
