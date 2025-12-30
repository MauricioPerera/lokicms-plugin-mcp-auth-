/**
 * MCP Server Middleware
 *
 * Provides middleware functions to wrap MCP server handlers
 * with role-based authentication and tool filtering.
 */

import type { z } from 'zod';
import type { MCPAuthInstance, MCPTool } from './types.js';
import { createMCPAuth } from './mcp-auth.js';

/**
 * Options for creating MCP middleware
 */
export interface MCPMiddlewareOptions {
  /** MCP Auth instance (uses default if not provided) */
  auth?: MCPAuthInstance;
  /** Callback for access denied events */
  onAccessDenied?: (toolName: string, role: string) => void;
  /** Callback for successful tool execution */
  onToolExecuted?: (toolName: string, role: string) => void;
}

/**
 * Wrapped tools result
 */
export interface WrappedTools {
  /** Get filtered list of tools for ListTools request */
  getToolsList: () => Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>;
  /** Execute a tool with permission check */
  executeTool: (
    name: string,
    args: unknown
  ) => Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;
  /** Get current role */
  getRole: () => string;
  /** Get agent info */
  getAgentInfo: () => ReturnType<MCPAuthInstance['getAgentInfo']>;
}

/**
 * Convert Zod schema to JSON Schema
 */
function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  // Handle ZodObject
  if ('shape' in schema && typeof schema.shape === 'object') {
    const shape = schema.shape as Record<string, z.ZodType>;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value);

      // Check if required (not optional or nullable)
      const isOptional = '_def' in value &&
        (value._def as { typeName?: string }).typeName === 'ZodOptional';
      const isNullable = '_def' in value &&
        (value._def as { typeName?: string }).typeName === 'ZodNullable';

      if (!isOptional && !isNullable) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  // Handle other types via _def
  if ('_def' in schema) {
    const def = schema._def as { typeName?: string; description?: string; values?: string[] };
    const typeName = def.typeName;

    switch (typeName) {
      case 'ZodString':
        return { type: 'string', description: def.description };
      case 'ZodNumber':
        return { type: 'number', description: def.description };
      case 'ZodBoolean':
        return { type: 'boolean', description: def.description };
      case 'ZodArray':
        return {
          type: 'array',
          items: zodToJsonSchema((schema._def as { type: z.ZodType }).type),
          description: def.description,
        };
      case 'ZodEnum':
        return {
          type: 'string',
          enum: def.values,
          description: def.description,
        };
      case 'ZodOptional':
        return zodToJsonSchema((schema._def as { innerType: z.ZodType }).innerType);
      case 'ZodNullable': {
        const inner = zodToJsonSchema((schema._def as { innerType: z.ZodType }).innerType);
        return { ...inner, nullable: true };
      }
      case 'ZodRecord':
        return {
          type: 'object',
          additionalProperties: true,
          description: def.description,
        };
    }
  }

  return { type: 'object' };
}

/**
 * Create MCP middleware that wraps tools with auth
 */
export function createMCPMiddleware(
  tools: Record<string, MCPTool>,
  options: MCPMiddlewareOptions = {}
): WrappedTools {
  const auth = options.auth || createMCPAuth();
  const role = auth.getRoleFromEnv();

  /**
   * Get filtered list of tools
   */
  function getToolsList() {
    const filteredTools = auth.filterTools(tools);

    return Object.entries(filteredTools).map(([name, tool]) => ({
      name,
      description: (tool as MCPTool).description,
      inputSchema: zodToJsonSchema((tool as MCPTool).inputSchema),
    }));
  }

  /**
   * Execute a tool with permission check
   */
  async function executeTool(name: string, args: unknown) {
    // Check permission
    if (!auth.isToolAllowed(name)) {
      options.onAccessDenied?.(name, role);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Access denied: Tool "${name}" is not available for role "${role}"`,
              role,
              hint: 'This tool requires higher privileges.',
            }),
          },
        ],
        isError: true,
      };
    }

    const tool = tools[name];

    if (!tool) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: `Unknown tool: ${name}` }),
          },
        ],
        isError: true,
      };
    }

    try {
      // Validate and execute
      const validatedArgs = tool.inputSchema.parse(args ?? {});
      const result = await tool.handler(validatedArgs);

      options.onToolExecuted?.(name, role);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: message }),
          },
        ],
        isError: true,
      };
    }
  }

  return {
    getToolsList,
    executeTool,
    getRole: () => role,
    getAgentInfo: () => auth.getAgentInfo(),
  };
}

/**
 * Create request handlers for MCP server
 */
export function createMCPHandlers(
  tools: Record<string, MCPTool>,
  options: MCPMiddlewareOptions = {}
) {
  const middleware = createMCPMiddleware(tools, options);

  return {
    /**
     * Handler for ListToolsRequest
     */
    handleListTools: async () => ({
      tools: middleware.getToolsList(),
    }),

    /**
     * Handler for CallToolRequest
     */
    handleCallTool: async (request: { params: { name: string; arguments?: unknown } }) => {
      const { name, arguments: args } = request.params;
      return middleware.executeTool(name, args);
    },

    /**
     * Get middleware instance
     */
    middleware,
  };
}
