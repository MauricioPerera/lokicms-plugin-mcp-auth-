/**
 * MCP Auth - Role-based authentication and tool filtering
 */

import type {
  RoleConfig,
  RoleInfo,
  AgentInfo,
  AuthResult,
  ToolFilter,
  MCPAuthConfig,
  MCPAuthInstance,
} from './types.js';
import { DEFAULT_ROLES, DEFAULT_KNOWN_TOOLS, DEFAULT_CONFIG } from './defaults.js';

/**
 * Create an MCP Auth instance with custom configuration
 */
export function createMCPAuth(userConfig: MCPAuthConfig = {}): MCPAuthInstance {
  // Merge configuration with defaults
  const config: Required<MCPAuthConfig> = {
    roles: { ...DEFAULT_ROLES, ...userConfig.roles },
    defaultRole: userConfig.defaultRole ?? DEFAULT_CONFIG.defaultRole,
    apiKeyMap: userConfig.apiKeyMap ?? {},
    knownTools: userConfig.knownTools ?? DEFAULT_KNOWN_TOOLS,
    roleEnvVar: userConfig.roleEnvVar ?? DEFAULT_CONFIG.roleEnvVar,
    apiKeyEnvVar: userConfig.apiKeyEnvVar ?? DEFAULT_CONFIG.apiKeyEnvVar,
  };

  /**
   * Get role from environment variable
   */
  function getRoleFromEnv(): string {
    // Direct role specification
    const directRole = process.env[config.roleEnvVar];
    if (directRole && config.roles[directRole]) {
      return directRole;
    }

    // API key based role
    const apiKey = process.env[config.apiKeyEnvVar];
    if (apiKey) {
      return getRoleFromApiKey(apiKey);
    }

    // Default role
    return config.defaultRole;
  }

  /**
   * Get role from API key prefix
   */
  function getRoleFromApiKey(apiKey: string): string {
    // Check first 14 characters as prefix
    const prefix = apiKey.substring(0, 14);

    if (config.apiKeyMap[prefix]) {
      return config.apiKeyMap[prefix];
    }

    // Check if any key prefix matches
    for (const [keyPrefix, role] of Object.entries(config.apiKeyMap)) {
      if (apiKey.startsWith(keyPrefix)) {
        return role;
      }
    }

    return config.defaultRole;
  }

  /**
   * Authenticate agent
   */
  function authenticateAgent(): AuthResult {
    const role = getRoleFromEnv();
    const apiKey = process.env[config.apiKeyEnvVar];

    if (!config.roles[role]) {
      return {
        authenticated: false,
        role: null,
        userId: null,
        error: `Unknown role: ${role}`,
      };
    }

    return {
      authenticated: true,
      role,
      userId: apiKey ? `api-key:${apiKey.substring(0, 14)}` : 'env-role',
    };
  }

  /**
   * Get allowed tools for a role
   */
  function getAllowedTools(role: string): string[] {
    const roleConfig = config.roles[role];
    if (!roleConfig) {
      return [];
    }

    if (roleConfig.tools === '*') {
      return [...config.knownTools];
    }

    return roleConfig.tools;
  }

  /**
   * Get blocked tools for a role
   */
  function getBlockedTools(role: string): string[] {
    const roleConfig = config.roles[role];
    if (!roleConfig || roleConfig.tools === '*') {
      return [];
    }

    return roleConfig.blockedTools || [];
  }

  /**
   * Check if a tool is allowed
   */
  function isToolAllowed(toolName: string, role?: string): boolean {
    const currentRole = role || getRoleFromEnv();
    const roleConfig = config.roles[currentRole];

    if (!roleConfig) {
      return false;
    }

    if (roleConfig.tools === '*') {
      return true;
    }

    return roleConfig.tools.includes(toolName);
  }

  /**
   * Filter tools object based on role
   */
  function filterTools<T extends Record<string, unknown>>(
    tools: T,
    role?: string
  ): Partial<T> {
    const currentRole = role || getRoleFromEnv();
    const roleConfig = config.roles[currentRole];

    if (!roleConfig) {
      return {};
    }

    if (roleConfig.tools === '*') {
      return tools;
    }

    const allowedTools = new Set(roleConfig.tools);
    const filtered: Partial<T> = {};

    for (const [name, tool] of Object.entries(tools)) {
      if (allowedTools.has(name)) {
        (filtered as Record<string, unknown>)[name] = tool;
      }
    }

    return filtered;
  }

  /**
   * Get tool filter configuration
   */
  function getToolFilter(): ToolFilter {
    const auth = authenticateAgent();
    const role = auth.role || config.defaultRole;

    return {
      allowedTools: getAllowedTools(role),
      blockedTools: getBlockedTools(role),
      role,
      userId: auth.userId || 'anonymous',
    };
  }

  /**
   * Get all available roles
   */
  function getRoles(): RoleInfo[] {
    return Object.entries(config.roles).map(([key, roleConfig]) => ({
      key,
      name: roleConfig.name,
      description: roleConfig.description,
      accessLevel: roleConfig.accessLevel,
      toolCount:
        roleConfig.tools === '*'
          ? config.knownTools.length
          : roleConfig.tools.length,
    }));
  }

  /**
   * Get current agent info
   */
  function getAgentInfo(): AgentInfo {
    const role = getRoleFromEnv();
    const roleConfig = config.roles[role] || config.roles[config.defaultRole]!;
    const allowed = getAllowedTools(role);
    const blocked = getBlockedTools(role);

    return {
      role,
      name: roleConfig.name,
      description: roleConfig.description,
      allowedToolCount: allowed.length,
      blockedToolCount: blocked.length,
    };
  }

  /**
   * Register a custom role
   */
  function registerRole(key: string, roleConfig: RoleConfig): void {
    config.roles[key] = roleConfig;
  }

  /**
   * Map API key prefix to role
   */
  function mapApiKey(prefix: string, role: string): void {
    config.apiKeyMap[prefix] = role;
  }

  return {
    config,
    getRoleFromEnv,
    getRoleFromApiKey,
    authenticateAgent,
    getAllowedTools,
    getBlockedTools,
    isToolAllowed,
    filterTools,
    getToolFilter,
    getRoles,
    getAgentInfo,
    registerRole,
    mapApiKey,
  };
}

// Default instance with default configuration
export const mcpAuth = createMCPAuth();
