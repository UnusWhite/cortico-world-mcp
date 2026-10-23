import type { ConfigGroup } from 'cortico/core/types.ts';
import type { Language } from 'cortico/core/language.ts';
import { mcpText } from './i18n/index.ts';

/** World id, config section `worlds.mcp` and WebUI page `world:mcp`. */
export const MCP_ID = 'mcp';

/** config.json 的 worlds.mcp 段，默认禁用；部署在 World 页启用。 */
export interface McpConfigSection {
  enabled: boolean;
  /** JSON array of server definitions; see `parseServers`. */
  servers: string;
  /** Start and list-tools deadline for one server. */
  connectTimeoutMs: number;
  /** One tool call's deadline. */
  callTimeoutMs: number;
  /** Characters one tool receipt may give the model. */
  maxResultChars: number;
}

export const MCP_DEFAULTS: McpConfigSection = {
  enabled: false,
  servers: '',
  connectTimeoutMs: 15_000,
  callTimeoutMs: 60_000,
  maxResultChars: 20_000,
};

export function mcpConfigGroup(language: Language = 'zh'): ConfigGroup {
  const t = mcpText(language).config;
  return {
    id: 'world:mcp',
    owner: 'world:mcp',
    schema: {
      type: 'object',
      title: t.title,
      description: t.description,
      properties: {
        'worlds.mcp.servers': {
          type: 'string',
          title: t.serversTitle,
          description: t.serversDescription,
          'x-hot': false,
        },
        'worlds.mcp.connectTimeoutMs': {
          type: 'integer',
          title: t.connectTimeoutTitle,
          description: t.connectTimeoutDescription,
          minimum: 1000,
          maximum: 120_000,
          multipleOf: 1000,
          'x-scale': 1000,
          'x-suffix': 's',
          'x-hot': false,
        },
        'worlds.mcp.callTimeoutMs': {
          type: 'integer',
          title: t.callTimeoutTitle,
          description: t.callTimeoutDescription,
          minimum: 1000,
          maximum: 600_000,
          multipleOf: 1000,
          'x-scale': 1000,
          'x-suffix': 's',
          'x-hot': true,
        },
        'worlds.mcp.maxResultChars': {
          type: 'integer',
          title: t.maxResultCharsTitle,
          description: t.maxResultCharsDescription,
          minimum: 1000,
          maximum: 200_000,
          multipleOf: 1000,
          'x-hot': true,
        },
      },
    },
  };
}
