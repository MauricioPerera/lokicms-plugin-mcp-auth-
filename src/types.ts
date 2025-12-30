/**
 * Type definitions for MCP Auth Plugin
 */

import type { z } from 'zod';

/**
 * Configuration for a role
 */
export interface RoleConfig {
  /** Display name of the role */
  name: string;
  /** Description of what this role can do */
  description: string;
  /** Access level: 'full' for admin, 'limited' for restricted roles */
  accessLevel: 'full' | 'limited';
  /** Array of allowed tool names, or '*' for all tools */
  tools: string[] | '*';
  /** Optional array of explicitly blocked tools (for documentation) */
  blockedTools?: string[];
}

/**
 * Result of tool filtering
 */
export interface ToolFilter {
  /** Tools allowed for the current role */
  allowedTools: string[];
  /** Tools blocked for the current role */
  blockedTools: string[];
  /** Current role name */
  role: string;
  /** User identifier */
  userId: string;
}

/**
 * Result of authentication
 */
export interface AuthResult {
  /** Whether authentication was successful */
  authenticated: boolean;
  /** Role of the authenticated agent */
  role: string | null;
  /** User ID of the authenticated agent */
  userId: string | null;
  /** Error message if authentication failed */
  error?: string;
}

/**
 * Role information
 */
export interface RoleInfo {
  /** Role key/identifier */
  key: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Access level */
  accessLevel: string;
  /** Number of allowed tools */
  toolCount: number;
}

/**
 * Agent information
 */
export interface AgentInfo {
  /** Current role */
  role: string;
  /** Role display name */
  name: string;
  /** Role description */
  description: string;
  /** Number of allowed tools */
  allowedToolCount: number;
  /** Number of blocked tools */
  blockedToolCount: number;
}

/**
 * MCP Tool definition
 */
export interface MCPTool {
  /** Tool description */
  description: string;
  /** Zod schema for input validation */
  inputSchema: z.ZodType;
  /** Handler function */
  handler: (args: unknown) => Promise<unknown>;
}

/**
 * Configuration options for MCPAuth
 */
export interface MCPAuthConfig {
  /** Custom role configurations (merged with defaults) */
  roles?: Record<string, RoleConfig>;
  /** Default role when no authentication is provided */
  defaultRole?: string;
  /** API key to role mapping */
  apiKeyMap?: Record<string, string>;
  /** List of all known tools (for admin '*' access) */
  knownTools?: string[];
  /** Environment variable name for role */
  roleEnvVar?: string;
  /** Environment variable name for API key */
  apiKeyEnvVar?: string;
}

/**
 * MCP Auth instance
 */
export interface MCPAuthInstance {
  /** Configuration */
  config: MCPAuthConfig;
  /** Get role from environment */
  getRoleFromEnv: () => string;
  /** Get role from API key */
  getRoleFromApiKey: (apiKey: string) => string;
  /** Authenticate agent */
  authenticateAgent: () => AuthResult;
  /** Get allowed tools for a role */
  getAllowedTools: (role: string) => string[];
  /** Get blocked tools for a role */
  getBlockedTools: (role: string) => string[];
  /** Check if tool is allowed */
  isToolAllowed: (toolName: string, role?: string) => boolean;
  /** Filter tools object */
  filterTools: <T extends Record<string, unknown>>(tools: T, role?: string) => Partial<T>;
  /** Get tool filter */
  getToolFilter: () => ToolFilter;
  /** Get all roles */
  getRoles: () => RoleInfo[];
  /** Get current agent info */
  getAgentInfo: () => AgentInfo;
  /** Register a custom role */
  registerRole: (key: string, config: RoleConfig) => void;
  /** Map API key to role */
  mapApiKey: (prefix: string, role: string) => void;
}
