// Tests for role-utils
import assert from 'node:assert/strict';
import { hasRole, isRole } from '@/lib/runtime/role-utils';

// Helper to run tests
function testHasRole() {
  // Owner has all roles
  assert.equal(hasRole('owner', 'owner'), true, 'owner should have owner');
  assert.equal(hasRole('owner', 'reviewer'), true, 'owner should have reviewer');
  assert.equal(hasRole('owner', 'contributor'), true, 'owner should have contributor');
  // Reviewer hierarchy
  assert.equal(hasRole('reviewer', 'owner'), false, 'reviewer should not have owner');
  assert.equal(hasRole('reviewer', 'reviewer'), true, 'reviewer should have reviewer');
  assert.equal(hasRole('reviewer', 'contributor'), true, 'reviewer should have contributor');
  // Contributor only itself
  assert.equal(hasRole('contributor', 'owner'), false, 'contributor should not have owner');
  assert.equal(hasRole('contributor', 'reviewer'), false, 'contributor should not have reviewer');
  assert.equal(hasRole('contributor', 'contributor'), true, 'contributor should have contributor');
}

function testIsRole() {
  assert.equal(isRole('owner', 'owner'), true);
  assert.equal(isRole('owner', 'reviewer'), false);
  assert.equal(isRole('reviewer', 'contributor'), false);
  assert.equal(isRole('contributor', 'contributor'), true);
}

testHasRole();
testIsRole();

console.log('All role-utils tests passed');
