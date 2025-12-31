/**
 * MCP Server with Role-Based Authentication
 *
 * This server wraps the LokiCMS MCP server with authentication
 * and tool filtering based on the configured role.
 *
 * Environment variables:
 *   - DB_PATH: Path to the database (default: ./data/cms.db)
 *   - AGENT_ROLE: Role for the agent (admin, editor, author, viewer)
 *   - AGENT_API_KEY: API key for authentication (optional)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Import from lokicms source (using tsx)
import { initDatabase, closeDatabase, saveDatabase } from '../../node_modules/lokicms/src/db/index.js';
import { contentTools } from '../../node_modules/lokicms/src/mcp/tools/content.js';
import { taxonomyTools } from '../../node_modules/lokicms/src/mcp/tools/taxonomy.js';
import { userTools } from '../../node_modules/lokicms/src/mcp/tools/users.js';
import { structureTools } from '../../node_modules/lokicms/src/mcp/tools/structure.js';
import { systemTools } from '../../node_modules/lokicms/src/mcp/tools/system.js';
import { mcpToolRegistry } from '../../node_modules/lokicms/src/plugins/index.js';

import { createMCPAuth, type MCPTool } from './src/index.js';

// Core tools (static)
const coreTools: Record<string, MCPTool> = {
  ...contentTools,
  ...taxonomyTools,
  ...userTools,
  ...structureTools,
  ...systemTools,
} as Record<string, MCPTool>;

// Get all tools including plugin tools (dynamic)
function getAllTools(): Record<string, MCPTool> {
  return {
    ...coreTools,
    ...mcpToolRegistry.getAll(),
  } as Record<string, MCPTool>;
}

// Create auth instance
const auth = createMCPAuth();

// Log current role
const role = auth.getRoleFromEnv();
const agentInfo = auth.getAgentInfo();
console.error(`[MCP-Auth] Role: ${role} (${agentInfo.name})`);
console.error(`[MCP-Auth] Allowed tools: ${agentInfo.allowedToolCount}`);

// Convert Zod schema to JSON Schema for MCP
function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodValue = value as z.ZodType;
      properties[key] = zodToJsonSchema(zodValue);

      if (!(zodValue instanceof z.ZodOptional) && !(zodValue instanceof z.ZodNullable)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  if (schema instanceof z.ZodString) {
    return { type: 'string', description: schema.description };
  }

  if (schema instanceof z.ZodNumber) {
    return { type: 'number', description: schema.description };
  }

  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean', description: schema.description };
  }

  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodToJsonSchema(schema.element),
      description: schema.description,
    };
  }

  if (schema instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: schema.options,
      description: schema.description,
    };
  }

  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema(schema.unwrap());
  }

  if (schema instanceof z.ZodNullable) {
    const inner = zodToJsonSchema(schema.unwrap());
    return { ...inner, nullable: true };
  }

  if (schema instanceof z.ZodRecord) {
    return {
      type: 'object',
      additionalProperties: true,
      description: schema.description,
    };
  }

  return { type: 'object' };
}

// Create MCP server
const server = new Server(
  {
    name: 'lokicms-auth',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools request - FILTERED by role
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const allTools = getAllTools();

  // Filter tools based on role
  const filteredTools = auth.filterTools(allTools);

  const tools = Object.entries(filteredTools).map(([name, tool]) => ({
    name,
    description: (tool as MCPTool).description,
    inputSchema: zodToJsonSchema((tool as MCPTool).inputSchema),
  }));

  console.error(`[MCP-Auth] ListTools: returning ${tools.length} tools for role "${role}"`);
  return { tools };
});

// Handle call tool request - WITH permission check
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const allTools = getAllTools();

  // Check permission FIRST
  if (!auth.isToolAllowed(name)) {
    console.error(`[MCP-Auth] Access denied: "${name}" for role "${role}"`);
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

  const tool = allTools[name];
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
    // Validate input
    const validatedArgs = tool.inputSchema.parse(args ?? {});

    // Execute handler
    const result = await tool.handler(validatedArgs);

    console.error(`[MCP-Auth] Tool executed: "${name}" by role "${role}"`);
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
});

// Database configuration
const DB_PATH = process.env['DB_PATH'] || './data/cms.db';

// Start server
async function startServer() {
  try {
    // Initialize database
    console.error('[MCP-Auth] Initializing database...');
    await initDatabase({
      path: DB_PATH,
      autosave: true,
      autosaveInterval: 5000,
    });
    console.error('[MCP-Auth] Database initialized');

    // Create transport
    const transport = new StdioServerTransport();

    // Connect server to transport
    await server.connect(transport);
    console.error('[MCP-Auth] Server running on stdio');
    console.error(`[MCP-Auth] Role: ${role} | Tools available: ${agentInfo.allowedToolCount}`);

    // Graceful shutdown
    const shutdown = async () => {
      console.error('\n[MCP-Auth] Shutting down...');
      await saveDatabase();
      await closeDatabase();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('[MCP-Auth] Failed to start server:', error);
    process.exit(1);
  }
}

// Export server for testing
export { server, auth };

// Start if run directly
startServer();
