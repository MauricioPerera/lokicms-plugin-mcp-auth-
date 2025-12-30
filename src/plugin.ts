/**
 * LokiCMS Plugin Definition for MCP Auth
 *
 * This file exports the plugin in the format required by LokiCMS plugin system.
 */

import { z } from 'zod';
import { createMCPAuth } from './mcp-auth.js';
import { DEFAULT_ROLES, DEFAULT_KNOWN_TOOLS } from './defaults.js';
import type { MCPAuthInstance } from './types.js';

/**
 * LokiCMS PluginDefinition interface
 * Since we can't import from loki-cms (peer dependency), we define it here
 */
interface PluginAPI {
  pluginName: string;
  services: unknown;
  hooks: {
    on: (event: string, handler: (...args: unknown[]) => Promise<unknown>) => void;
  };
  routes: {
    register: (router: unknown) => void;
  };
  mcp: {
    registerTool: (
      name: string,
      tool: {
        description: string;
        inputSchema: z.ZodSchema;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: (input: any) => Promise<unknown>;
      }
    ) => void;
  };
  database: {
    createCollection: (options: {
      name: string;
      options?: { unique?: string[]; indices?: string[] };
    }) => unknown;
  };
  contentTypes: {
    register: (config: unknown) => Promise<void>;
  };
  config: {
    get: <T>(key: string, defaultValue?: T) => T | undefined;
  };
  logger: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
  };
}

interface PluginDefinition {
  name: string;
  version: string;
  displayName?: string;
  description?: string;
  lifecycle?: {
    onLoad?: () => Promise<void>;
    onEnable?: () => Promise<void>;
    onDisable?: () => Promise<void>;
    onUninstall?: () => Promise<void>;
  };
  setup: (api: PluginAPI) => Promise<void>;
}

// Store the auth instance for use across the plugin
let authInstance: MCPAuthInstance | null = null;

/**
 * LokiCMS Plugin Definition
 */
const plugin: PluginDefinition = {
  name: 'mcp-auth',
  version: '1.0.0',
  displayName: 'MCP Auth',
  description: 'Role-based authentication and tool filtering for MCP servers',

  lifecycle: {
    onLoad: async () => {
      // Initialize auth instance with defaults
      authInstance = createMCPAuth();
    },
    onEnable: async () => {
      // Plugin enabled - auth is active
    },
    onDisable: async () => {
      // Plugin disabled - could clear auth instance
    },
    onUninstall: async () => {
      // Cleanup
      authInstance = null;
    },
  },

  async setup(api) {
    // Get plugin configuration
    const defaultRole = api.config.get<string>('defaultRole', 'viewer');
    const customRoles = api.config.get<Record<string, unknown>>('roles', {});
    const apiKeyMap = api.config.get<Record<string, string>>('apiKeyMap', {});
    const knownTools = api.config.get<string[]>('knownTools');

    // Create auth instance with plugin configuration
    authInstance = createMCPAuth({
      defaultRole,
      roles: customRoles as Record<string, import('./types.js').RoleConfig>,
      apiKeyMap,
      knownTools,
    });

    api.logger.info(`MCP Auth initialized with default role: ${defaultRole}`);

    // Register MCP tool: get_agent_info
    api.mcp.registerTool('mcp_auth_get_agent_info', {
      description:
        'Get information about the current agent including role, permissions, and tool access',
      inputSchema: z.object({}),
      handler: async () => {
        if (!authInstance) {
          return { error: 'Auth not initialized' };
        }
        return authInstance.getAgentInfo();
      },
    });

    // Register MCP tool: get_allowed_tools
    api.mcp.registerTool('mcp_auth_get_allowed_tools', {
      description: 'Get list of tools allowed for a specific role',
      inputSchema: z.object({
        role: z
          .string()
          .optional()
          .describe('Role to check (defaults to current role from environment)'),
      }),
      handler: async (input: { role?: string }) => {
        if (!authInstance) {
          return { error: 'Auth not initialized' };
        }
        const role = input.role || authInstance.getRoleFromEnv();
        return {
          role,
          tools: authInstance.getAllowedTools(role),
          count: authInstance.getAllowedTools(role).length,
        };
      },
    });

    // Register MCP tool: get_blocked_tools
    api.mcp.registerTool('mcp_auth_get_blocked_tools', {
      description: 'Get list of tools blocked for a specific role',
      inputSchema: z.object({
        role: z
          .string()
          .optional()
          .describe('Role to check (defaults to current role from environment)'),
      }),
      handler: async (input: { role?: string }) => {
        if (!authInstance) {
          return { error: 'Auth not initialized' };
        }
        const role = input.role || authInstance.getRoleFromEnv();
        return {
          role,
          tools: authInstance.getBlockedTools(role),
          count: authInstance.getBlockedTools(role).length,
        };
      },
    });

    // Register MCP tool: check_tool_permission
    api.mcp.registerTool('mcp_auth_check_permission', {
      description: 'Check if a specific tool is allowed for a role',
      inputSchema: z.object({
        toolName: z.string().describe('Name of the tool to check'),
        role: z
          .string()
          .optional()
          .describe('Role to check (defaults to current role from environment)'),
      }),
      handler: async (input: { toolName: string; role?: string }) => {
        if (!authInstance) {
          return { error: 'Auth not initialized' };
        }
        const role = input.role || authInstance.getRoleFromEnv();
        const allowed = authInstance.isToolAllowed(input.toolName, role);
        return {
          tool: input.toolName,
          role,
          allowed,
          message: allowed
            ? `Tool '${input.toolName}' is allowed for role '${role}'`
            : `Tool '${input.toolName}' is NOT allowed for role '${role}'`,
        };
      },
    });

    // Register MCP tool: list_roles
    api.mcp.registerTool('mcp_auth_list_roles', {
      description: 'List all available roles and their configurations',
      inputSchema: z.object({}),
      handler: async () => {
        if (!authInstance) {
          return { error: 'Auth not initialized' };
        }
        return {
          roles: authInstance.getRoles(),
          defaultRoles: Object.keys(DEFAULT_ROLES),
          totalKnownTools: DEFAULT_KNOWN_TOOLS.length,
        };
      },
    });

    // Log initialization
    api.logger.info(
      `MCP Auth plugin registered 5 tools: mcp_auth_get_agent_info, mcp_auth_get_allowed_tools, mcp_auth_get_blocked_tools, mcp_auth_check_permission, mcp_auth_list_roles`
    );
  },
};

export default plugin;

// Also export a function to get the current auth instance
export function getAuthInstance(): MCPAuthInstance | null {
  return authInstance;
}
