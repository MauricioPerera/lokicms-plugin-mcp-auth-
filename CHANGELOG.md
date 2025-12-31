# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-31

### Added

- `server.ts` - Standalone MCP server with role-based authentication
- npm scripts for starting server with different roles:
  - `npm start` - Start server (uses AGENT_ROLE env var)
  - `npm run start:admin` - Start with admin role
  - `npm run start:editor` - Start with editor role
  - `npm run start:viewer` - Start with viewer role
- Integration with LokiCMS tools (content, taxonomy, users, structure, system)
- Automatic tool filtering based on configured role
- Permission checks before tool execution
- Detailed logging to stderr for debugging

### Changed

- Updated package.json to include server.ts in published files

## [1.0.0] - 2025-12-30

### Added

- Initial release
- Role-based access control (RBAC) for MCP servers
- Default roles: `admin`, `editor`, `author`, `viewer`
- Tool filtering based on role permissions
- Environment variable authentication (`AGENT_ROLE`, `AGENT_API_KEY`)
- API key prefix to role mapping
- `createMCPAuth()` factory function with custom configuration
- `createMCPMiddleware()` for easy MCP server integration
- `createMCPHandlers()` for pre-built request handlers
- Runtime role registration via `registerRole()`
- Runtime API key mapping via `mapApiKey()`
- Full TypeScript support with exported types
- Comprehensive documentation and examples

### Security

- Server-side tool filtering (not exposed to client)
- Blocked tools not included in ListTools response
- Access denied errors for unauthorized tool execution
- Default role is `viewer` (most restrictive)
- Callback support for access logging

## [Unreleased]

### Planned

- Database-backed role configuration
- Session-based authentication
- Rate limiting per role
- Audit logging integration
- Role inheritance/hierarchy
