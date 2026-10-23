/** Package entry: default export is the `WorldDefinition` the extension loader looks for. */
import { MCP } from './definition.ts';

export default MCP;
export { MCP };
export { MCP_DEFAULTS, MCP_ID, mcpConfigGroup, type McpConfigSection } from './config.ts';
export { MCP_TOOL_DECLS, McpWorld } from './world.ts';
