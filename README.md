# lokicms-plugin-mcp-auth

[![npm version](https://badge.fury.io/js/lokicms-plugin-mcp-auth.svg)](https://badge.fury.io/js/lokicms-plugin-mcp-auth)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

Role-based authentication and tool filtering for [MCP (Model Context Protocol)](https://modelcontextprotocol.io) servers.

## Features

- **Role-Based Access Control (RBAC)** - Define roles with specific tool permissions
- **Tool Filtering** - Automatically filter available tools based on agent role
- **Flexible Authentication** - Support for environment variables and API key prefixes
- **TypeScript Native** - Full type safety and IntelliSense support
- **Zero Dependencies** - Only requires `zod` for schema validation
- **Extensible** - Add custom roles and API key mappings at runtime
- **MCP SDK Compatible** - Works with `@modelcontextprotocol/sdk`

## Installation

```bash
npm install lokicms-plugin-mcp-auth
```

```bash
yarn add lokicms-plugin-mcp-auth
```

```bash
pnpm add lokicms-plugin-mcp-auth
```

## Quick Start

```typescript
import { createMCPAuth } from 'lokicms-plugin-mcp-auth';

// Create auth instance with default roles
const auth = createMCPAuth();

// Check if a tool is allowed for current role
if (auth.isToolAllowed('create_user')) {
  // Execute the tool
}

// Get filtered tools for MCP ListTools response
const filteredTools = auth.filterTools(allTools);

// Get current agent info
const info = auth.getAgentInfo();
console.log(`Role: ${info.role}, Allowed: ${info.allowedToolCount} tools`);
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AGENT_ROLE` | Direct role specification | `viewer` |
| `AGENT_API_KEY` | API key for role lookup | - |

The plugin checks `AGENT_ROLE` first, then falls back to `AGENT_API_KEY` prefix matching.

### Custom Configuration

```typescript
import { createMCPAuth } from 'lokicms-plugin-mcp-auth';

const auth = createMCPAuth({
  // Add or override roles
  roles: {
    custom_role: {
      name: 'Custom Role',
      description: 'A custom role with specific permissions',
      accessLevel: 'limited',
      tools: ['list_entries', 'get_entry', 'search'],
    },
  },

  // Default role when no auth is provided
  defaultRole: 'viewer',

  // Map API key prefixes to roles
  apiKeyMap: {
    'myapp_admin_': 'admin',
    'myapp_user_': 'editor',
  },

  // List of all known tools (for admin '*' access)
  knownTools: ['list_entries', 'create_entry', 'delete_entry'],

  // Custom environment variable names
  roleEnvVar: 'MY_AGENT_ROLE',
  apiKeyEnvVar: 'MY_API_KEY',
});
```

## Default Roles

| Role | Access Level | Tools | Description |
|------|--------------|-------|-------------|
| `admin` | full | All (*) | Full access to all operations |
| `editor` | limited | 26 | Read/write content, no structure changes |
| `author` | limited | 15 | Create and manage own content |
| `viewer` | limited | 13 | Read-only access |

### Editor Role Permissions

```
Structure (read-only):
  list_content_types, get_content_type, get_structure_summary

Entries (CRUD):
  list_entries, get_entry, create_entry, update_entry, delete_entry
  publish_entry, unpublish_entry

Taxonomies (read-only):
  list_taxonomies, get_taxonomy, list_terms, get_term
  assign_terms, get_entries_by_term

Search:
  search, search_in_content_type, search_suggest

Scheduler:
  scheduler_status, scheduler_upcoming, schedule_entry, cancel_schedule

Revisions:
  revision_list, revision_compare, revision_stats
```

## API Reference

### `createMCPAuth(config?)`

Creates a new MCP Auth instance.

```typescript
const auth = createMCPAuth({
  roles?: Record<string, RoleConfig>,
  defaultRole?: string,
  apiKeyMap?: Record<string, string>,
  knownTools?: string[],
  roleEnvVar?: string,
  apiKeyEnvVar?: string,
});
```

### Instance Methods

#### `auth.isToolAllowed(toolName, role?)`

Check if a tool is allowed for a role.

```typescript
auth.isToolAllowed('create_user');           // Check for current role
auth.isToolAllowed('create_user', 'editor'); // Check for specific role
```

#### `auth.filterTools(tools, role?)`

Filter a tools object, keeping only allowed tools.

```typescript
const allTools = { tool1: {...}, tool2: {...}, tool3: {...} };
const filtered = auth.filterTools(allTools); // Only allowed tools
```

#### `auth.getAllowedTools(role)`

Get array of allowed tool names for a role.

```typescript
const tools = auth.getAllowedTools('editor');
// ['list_entries', 'get_entry', ...]
```

#### `auth.getBlockedTools(role)`

Get array of blocked tool names for a role.

```typescript
const blocked = auth.getBlockedTools('editor');
// ['create_user', 'delete_user', ...]
```

#### `auth.getRoleFromEnv()`

Get current role from environment.

```typescript
const role = auth.getRoleFromEnv(); // 'admin', 'editor', etc.
```

#### `auth.getAgentInfo()`

Get current agent information.

```typescript
const info = auth.getAgentInfo();
// {
//   role: 'editor',
//   name: 'Editor',
//   description: 'Can read/write content but not modify structure',
//   allowedToolCount: 26,
//   blockedToolCount: 30
// }
```

#### `auth.getRoles()`

Get all available roles.

```typescript
const roles = auth.getRoles();
// [
//   { key: 'admin', name: 'Admin', toolCount: 56, accessLevel: 'full' },
//   { key: 'editor', name: 'Editor', toolCount: 26, accessLevel: 'limited' },
//   ...
// ]
```

#### `auth.registerRole(key, config)`

Register a new role at runtime.

```typescript
auth.registerRole('moderator', {
  name: 'Moderator',
  description: 'Can moderate content',
  accessLevel: 'limited',
  tools: ['list_entries', 'update_entry', 'delete_entry'],
});
```

#### `auth.mapApiKey(prefix, role)`

Map an API key prefix to a role.

```typescript
auth.mapApiKey('mod_key_', 'moderator');
```

## MCP Server Integration

### Using Middleware

```typescript
import { createMCPMiddleware } from 'lokicms-plugin-mcp-auth';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Your tools
const tools = {
  list_entries: { description: '...', inputSchema: z.object({}), handler: async () => {} },
  create_entry: { description: '...', inputSchema: z.object({}), handler: async () => {} },
  // ...
};

// Create middleware
const middleware = createMCPMiddleware(tools, {
  onAccessDenied: (tool, role) => {
    console.error(`[Auth] Blocked: ${tool} for role ${role}`);
  },
  onToolExecuted: (tool, role) => {
    console.log(`[Auth] Executed: ${tool} by ${role}`);
  },
});

// Create server
const server = new Server(
  { name: 'my-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Use middleware in handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: middleware.getToolsList(),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return middleware.executeTool(request.params.name, request.params.arguments);
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Using Pre-built Handlers

```typescript
import { createMCPHandlers } from 'lokicms-plugin-mcp-auth';

const { handleListTools, handleCallTool, middleware } = createMCPHandlers(tools);

server.setRequestHandler(ListToolsRequestSchema, handleListTools);
server.setRequestHandler(CallToolRequestSchema, handleCallTool);

console.log(`Running as: ${middleware.getRole()}`);
```

## MCP Configuration

Configure multiple server instances with different roles in `.mcp.json`:

```json
{
  "mcpServers": {
    "myapp-admin": {
      "command": "node",
      "args": ["./dist/server.js"],
      "env": {
        "AGENT_ROLE": "admin"
      }
    },
    "myapp-client": {
      "command": "node",
      "args": ["./dist/server.js"],
      "env": {
        "AGENT_ROLE": "editor"
      }
    },
    "myapp-readonly": {
      "command": "node",
      "args": ["./dist/server.js"],
      "env": {
        "AGENT_ROLE": "viewer"
      }
    }
  }
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AI Agent (Claude)                     │
└────────────────────────┬────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │   MCP Connection    │
              │   (role: editor)    │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │    MCP Auth         │
              │                     │
              │ ├─ filterTools()    │  ← Only 26 tools exposed
              │ ├─ isToolAllowed()  │  ← Block unauthorized calls
              │ └─ getAgentInfo()   │  ← Role information
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │    MCP Server       │
              │    (your tools)     │
              └─────────────────────┘
```

## Security

- Tool filtering happens **server-side**, not client-side
- Blocked tools are **not exposed** in ListTools response
- Attempting to execute blocked tools returns access denied error
- API keys are validated by prefix matching
- Default role is `viewer` (most restrictive)
- All access attempts are loggable via callbacks

## TypeScript

Full TypeScript support with exported types:

```typescript
import type {
  RoleConfig,
  RoleInfo,
  AgentInfo,
  AuthResult,
  ToolFilter,
  MCPAuthConfig,
  MCPAuthInstance,
  MCPTool,
} from 'lokicms-plugin-mcp-auth';
```

## Examples

### Custom Role for Moderation

```typescript
const auth = createMCPAuth({
  roles: {
    moderator: {
      name: 'Moderator',
      description: 'Can review and moderate content',
      accessLevel: 'limited',
      tools: [
        'list_entries',
        'get_entry',
        'update_entry',  // Can edit
        'unpublish_entry', // Can unpublish
        'search',
      ],
    },
  },
});
```

### API Key Based Authentication

```typescript
const auth = createMCPAuth({
  apiKeyMap: {
    'admin_': 'admin',
    'editor_': 'editor',
    'readonly_': 'viewer',
  },
});

// Set via environment
// AGENT_API_KEY=admin_abc123xyz
// Result: role = 'admin'
```

### Dynamic Role Registration

```typescript
const auth = createMCPAuth();

// Add roles at runtime
auth.registerRole('premium_user', {
  name: 'Premium User',
  description: 'Premium tier access',
  accessLevel: 'limited',
  tools: [...auth.getAllowedTools('editor'), 'export_data'],
});

// Map new API keys
auth.mapApiKey('premium_', 'premium_user');
```

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines.

## Related

- [Model Context Protocol](https://modelcontextprotocol.io)
- [MCP SDK](https://github.com/modelcontextprotocol/sdk)
- [Claude](https://claude.ai)
