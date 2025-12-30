/**
 * Tests for @anthropic/mcp-auth
 *
 * Run: npm test
 */

import { createMCPAuth, DEFAULT_ROLES, DEFAULT_KNOWN_TOOLS } from '../index.js';

// Test utilities
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${error instanceof Error ? error.message : error}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertArrayEqual<T>(actual: T[], expected: T[], message?: string) {
  if (actual.length !== expected.length) {
    throw new Error(
      message ||
        `Array length mismatch: expected ${expected.length}, got ${actual.length}`
    );
  }
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new Error(
        message ||
          `Array mismatch at index ${i}: expected ${expected[i]}, got ${actual[i]}`
      );
    }
  }
}

function assertTrue(value: boolean, message?: string) {
  if (!value) {
    throw new Error(message || 'Expected true, got false');
  }
}

function assertFalse(value: boolean, message?: string) {
  if (value) {
    throw new Error(message || 'Expected false, got true');
  }
}

// Run tests
console.log('\nlokicms-plugin-mcp-auth - Test Suite\n');
console.log('================================\n');

// Test: Default configuration
console.log('Default Configuration:');

test('should have default roles', () => {
  assertTrue(Object.keys(DEFAULT_ROLES).length >= 4);
  assertTrue('admin' in DEFAULT_ROLES);
  assertTrue('editor' in DEFAULT_ROLES);
  assertTrue('author' in DEFAULT_ROLES);
  assertTrue('viewer' in DEFAULT_ROLES);
});

test('should have known tools', () => {
  assertTrue(DEFAULT_KNOWN_TOOLS.length > 50);
});

// Test: createMCPAuth
console.log('\ncreate MCPAuth:');

test('should create instance with defaults', () => {
  const auth = createMCPAuth();
  assertTrue(auth !== null);
  assertTrue(typeof auth.isToolAllowed === 'function');
  assertTrue(typeof auth.filterTools === 'function');
});

test('should merge custom roles with defaults', () => {
  const auth = createMCPAuth({
    roles: {
      custom: {
        name: 'Custom',
        description: 'Custom role',
        accessLevel: 'limited',
        tools: ['tool1'],
      },
    },
  });
  const roles = auth.getRoles();
  assertTrue(roles.some((r) => r.key === 'admin'));
  assertTrue(roles.some((r) => r.key === 'custom'));
});

// Test: Role permissions
console.log('\nRole Permissions:');

test('admin should have access to all tools', () => {
  const auth = createMCPAuth();
  assertTrue(auth.isToolAllowed('create_user', 'admin'));
  assertTrue(auth.isToolAllowed('delete_user', 'admin'));
  assertTrue(auth.isToolAllowed('backup_create', 'admin'));
});

test('editor should have limited access', () => {
  const auth = createMCPAuth();
  assertTrue(auth.isToolAllowed('list_entries', 'editor'));
  assertTrue(auth.isToolAllowed('create_entry', 'editor'));
  assertFalse(auth.isToolAllowed('create_user', 'editor'));
  assertFalse(auth.isToolAllowed('backup_create', 'editor'));
});

test('viewer should have read-only access', () => {
  const auth = createMCPAuth();
  assertTrue(auth.isToolAllowed('list_entries', 'viewer'));
  assertTrue(auth.isToolAllowed('get_entry', 'viewer'));
  assertFalse(auth.isToolAllowed('create_entry', 'viewer'));
  assertFalse(auth.isToolAllowed('delete_entry', 'viewer'));
});

// Test: Tool filtering
console.log('\nTool Filtering:');

test('should filter tools for editor', () => {
  const auth = createMCPAuth();
  const tools = {
    list_entries: { name: 'list_entries' },
    create_user: { name: 'create_user' },
    search: { name: 'search' },
  };
  const filtered = auth.filterTools(tools, 'editor');
  assertTrue('list_entries' in filtered);
  assertTrue('search' in filtered);
  assertFalse('create_user' in filtered);
});

test('should not filter tools for admin', () => {
  const auth = createMCPAuth();
  const tools = {
    list_entries: { name: 'list_entries' },
    create_user: { name: 'create_user' },
    backup_create: { name: 'backup_create' },
  };
  const filtered = auth.filterTools(tools, 'admin');
  assertEqual(Object.keys(filtered).length, 3);
});

// Test: getAllowedTools
console.log('\ngetAllowedTools:');

test('admin should get all known tools', () => {
  const auth = createMCPAuth();
  const tools = auth.getAllowedTools('admin');
  assertEqual(tools.length, DEFAULT_KNOWN_TOOLS.length);
});

test('editor should get 26 tools', () => {
  const auth = createMCPAuth();
  const tools = auth.getAllowedTools('editor');
  assertEqual(tools.length, 26);
});

test('viewer should get 13 tools', () => {
  const auth = createMCPAuth();
  const tools = auth.getAllowedTools('viewer');
  assertEqual(tools.length, 13);
});

// Test: getBlockedTools
console.log('\ngetBlockedTools:');

test('admin should have no blocked tools', () => {
  const auth = createMCPAuth();
  const blocked = auth.getBlockedTools('admin');
  assertEqual(blocked.length, 0);
});

test('editor should have blocked tools', () => {
  const auth = createMCPAuth();
  const blocked = auth.getBlockedTools('editor');
  assertTrue(blocked.length > 0);
  assertTrue(blocked.includes('create_user'));
});

// Test: getRoles
console.log('\ngetRoles:');

test('should return all roles with info', () => {
  const auth = createMCPAuth();
  const roles = auth.getRoles();
  assertTrue(roles.length >= 4);

  const admin = roles.find((r) => r.key === 'admin');
  assertTrue(admin !== undefined);
  assertEqual(admin?.accessLevel, 'full');
});

// Test: getAgentInfo
console.log('\ngetAgentInfo:');

test('should return agent info based on env', () => {
  const auth = createMCPAuth({ defaultRole: 'viewer' });
  const info = auth.getAgentInfo();
  assertEqual(info.role, 'viewer');
  assertTrue(info.allowedToolCount > 0);
});

// Test: registerRole
console.log('\nregisterRole:');

test('should register new role at runtime', () => {
  const auth = createMCPAuth();
  auth.registerRole('tester', {
    name: 'Tester',
    description: 'Test role',
    accessLevel: 'limited',
    tools: ['list_entries'],
  });

  assertTrue(auth.isToolAllowed('list_entries', 'tester'));
  assertFalse(auth.isToolAllowed('create_user', 'tester'));
});

// Test: mapApiKey
console.log('\nmapApiKey:');

test('should map API key prefix to role', () => {
  const auth = createMCPAuth({
    apiKeyMap: {},
  });
  auth.mapApiKey('test_admin_', 'admin');
  const role = auth.getRoleFromApiKey('test_admin_12345');
  assertEqual(role, 'admin');
});

// Test: Custom configuration
console.log('\nCustom Configuration:');

test('should use custom default role', () => {
  const auth = createMCPAuth({ defaultRole: 'editor' });
  const info = auth.getAgentInfo();
  assertEqual(info.role, 'editor');
});

test('should use custom known tools for admin', () => {
  const auth = createMCPAuth({
    knownTools: ['custom_tool_1', 'custom_tool_2'],
  });
  const tools = auth.getAllowedTools('admin');
  assertEqual(tools.length, 2);
  assertTrue(tools.includes('custom_tool_1'));
});

// Summary
console.log('\n================================');
console.log(`\nResults: ${passed} passed, ${failed} failed`);
console.log('');

if (failed > 0) {
  process.exit(1);
}
