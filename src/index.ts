/**
 * lokicms-plugin-mcp-auth
 *
 * Role-based authentication and tool filtering for MCP servers.
 * LokiCMS plugin for AI agent authentication and authorization.
 *
 * @example
 * ```typescript
 * import { createMCPAuth } from 'lokicms-plugin-mcp-auth';
 *
 * // Create with default configuration
 * const auth = createMCPAuth();
 *
 * // Or with custom configuration
 * const auth = createMCPAuth({
 *   roles: {
 *     custom: {
 *       name: 'Custom Role',
 *       description: 'My custom role',
 *       accessLevel: 'limited',
 *       tools: ['tool1', 'tool2'],
 *     },
 *   },
 *   defaultRole: 'viewer',
 *   apiKeyMap: {
 *     'mykey_prefix': 'admin',
 *   },
 * });
 *
 * // Check permissions
 * if (auth.isToolAllowed('create_user')) {
 *   // Execute tool
 * }
 *
 * // Filter tools for MCP response
 * const filteredTools = auth.filterTools(allTools);
 * ```
 *
 * @packageDocumentation
 */

// Re-export types
export type {
  RoleConfig,
  RoleInfo,
  AgentInfo,
  AuthResult,
  ToolFilter,
  MCPAuthConfig,
  MCPAuthInstance,
  MCPTool,
} from './types.js';

// Re-export defaults
export {
  DEFAULT_ROLES,
  DEFAULT_KNOWN_TOOLS,
  DEFAULT_CONFIG,
} from './defaults.js';

// Re-export main functionality
export { createMCPAuth, mcpAuth } from './mcp-auth.js';

// Re-export middleware
export {
  createMCPMiddleware,
  createMCPHandlers,
  type MCPMiddlewareOptions,
  type WrappedTools,
} from './middleware.js';

// Re-export plugin definition and utilities
export { getAuthInstance } from './plugin.js';

// Default export is the LokiCMS plugin definition
export { default } from './plugin.js';
