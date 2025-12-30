/**
 * Default configuration for MCP Auth Plugin
 */

import type { RoleConfig } from './types.js';

/**
 * Default role configurations
 */
export const DEFAULT_ROLES: Record<string, RoleConfig> = {
  admin: {
    name: 'Admin',
    description: 'Full access to all operations',
    accessLevel: 'full',
    tools: '*',
  },
  editor: {
    name: 'Editor',
    description: 'Can read/write content but not modify structure',
    accessLevel: 'limited',
    tools: [
      // Structure (read-only)
      'list_content_types',
      'get_content_type',
      'get_structure_summary',
      // Entries CRUD
      'list_entries',
      'get_entry',
      'create_entry',
      'update_entry',
      'delete_entry',
      'publish_entry',
      'unpublish_entry',
      // Taxonomies (read-only)
      'list_taxonomies',
      'get_taxonomy',
      // Terms (read + assign)
      'list_terms',
      'get_term',
      'assign_terms',
      'get_entries_by_term',
      // Search
      'search',
      'search_in_content_type',
      'search_suggest',
      // Scheduler
      'scheduler_status',
      'scheduler_upcoming',
      'schedule_entry',
      'cancel_schedule',
      // Revisions (read-only)
      'revision_list',
      'revision_compare',
      'revision_stats',
    ],
    blockedTools: [
      'create_content_type',
      'delete_content_type',
      'import_structure',
      'export_structure',
      'create_taxonomy',
      'delete_taxonomy',
      'create_term',
      'update_term',
      'delete_term',
      'list_users',
      'get_user',
      'create_user',
      'update_user',
      'update_user_role',
      'delete_user',
      'create_api_key',
      'list_api_keys',
      'revoke_api_key',
      'webhook_list',
      'webhook_create',
      'webhook_test',
      'webhook_stats',
      'backup_create',
      'backup_list',
      'backup_restore',
      'backup_stats',
      'audit_recent',
      'audit_query',
      'audit_resource_history',
      'audit_stats',
    ],
  },
  author: {
    name: 'Author',
    description: 'Can create and manage own content',
    accessLevel: 'limited',
    tools: [
      'list_content_types',
      'get_content_type',
      'get_structure_summary',
      'list_entries',
      'get_entry',
      'create_entry',
      'update_entry',
      'list_taxonomies',
      'get_taxonomy',
      'list_terms',
      'get_term',
      'assign_terms',
      'search',
      'search_in_content_type',
      'search_suggest',
    ],
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access to content',
    accessLevel: 'limited',
    tools: [
      'list_content_types',
      'get_content_type',
      'get_structure_summary',
      'list_entries',
      'get_entry',
      'list_taxonomies',
      'get_taxonomy',
      'list_terms',
      'get_term',
      'get_entries_by_term',
      'search',
      'search_in_content_type',
      'search_suggest',
    ],
  },
};

/**
 * Default list of all known MCP tools
 */
export const DEFAULT_KNOWN_TOOLS: string[] = [
  // Content Types
  'list_content_types',
  'get_content_type',
  'create_content_type',
  'delete_content_type',
  // Entries
  'list_entries',
  'get_entry',
  'create_entry',
  'update_entry',
  'delete_entry',
  'publish_entry',
  'unpublish_entry',
  // Taxonomies
  'list_taxonomies',
  'get_taxonomy',
  'create_taxonomy',
  'delete_taxonomy',
  // Terms
  'list_terms',
  'get_term',
  'create_term',
  'update_term',
  'delete_term',
  'assign_terms',
  'get_entries_by_term',
  // Users
  'list_users',
  'get_user',
  'create_user',
  'update_user',
  'update_user_role',
  'delete_user',
  // API Keys
  'create_api_key',
  'list_api_keys',
  'revoke_api_key',
  // Search
  'search',
  'search_in_content_type',
  'search_suggest',
  // Scheduler
  'scheduler_status',
  'scheduler_upcoming',
  'schedule_entry',
  'cancel_schedule',
  // Audit
  'audit_recent',
  'audit_query',
  'audit_resource_history',
  'audit_stats',
  // Revisions
  'revision_list',
  'revision_compare',
  'revision_stats',
  // Webhooks
  'webhook_list',
  'webhook_create',
  'webhook_test',
  'webhook_stats',
  // Backups
  'backup_create',
  'backup_list',
  'backup_restore',
  'backup_stats',
  // Structure
  'export_structure',
  'import_structure',
  'get_structure_summary',
];

/**
 * Default configuration
 */
export const DEFAULT_CONFIG = {
  defaultRole: 'viewer',
  roleEnvVar: 'AGENT_ROLE',
  apiKeyEnvVar: 'AGENT_API_KEY',
};
