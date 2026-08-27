import { CloudUsersStore } from '../client/src/services/cloud_users_store.ts';

// Polyfill localStorage & window for Node environment testing
const memoryStorage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => memoryStorage.get(key) || null,
  setItem: (key: string, value: string) => memoryStorage.set(key, value),
  removeItem: (key: string) => memoryStorage.delete(key),
  clear: () => memoryStorage.clear(),
};

async function runAuthTests() {
  console.log('🧪 Starting Cloud Auth & User Management Tests...');

  const testUser = `testuser_${Date.now()}`;
  const testPass = 'SecurePass123!';

  // 1. Test Registration
  console.log(`[1/5] Testing registration for @${testUser}...`);
  const session = await CloudUsersStore.register(testUser, testPass, 'Test Localization Engineer');
  console.log(`  ✓ Registration successful: @${session.user.username} (${session.user.role})`);

  if (!session.token || session.user.username !== testUser) {
    throw new Error('Registration assertion failed');
  }

  // 2. Test Get Current User (Session persistence)
  console.log('[2/5] Testing session persistence (getMe)...');
  const me = await CloudUsersStore.getMe();
  if (!me || me.username !== testUser) {
    throw new Error('Session getMe failed');
  }
  console.log(`  ✓ Current session active for @${me.username}`);

  // 3. Test Invalid Password Login
  console.log('[3/5] Testing wrong password rejection...');
  try {
    await CloudUsersStore.login(testUser, 'WrongPassword!');
    throw new Error('Expected login with wrong password to fail');
  } catch (err: any) {
    console.log(`  ✓ Correctly rejected invalid credentials: "${err.message}"`);
  }

  // 4. Test Valid Login
  console.log('[4/5] Testing login with valid credentials...');
  const loginSession = await CloudUsersStore.login(testUser, testPass);
  if (!loginSession.token || loginSession.user.username !== testUser) {
    throw new Error('Login failed for valid user');
  }
  console.log(`  ✓ Successfully logged in: @${loginSession.user.username}`);

  // 5. Test User List & Cleanup
  console.log('[5/5] Testing user deletion and cleanup...');
  const deleted = await CloudUsersStore.deleteUser(session.user.id);
  console.log(`  ✓ Deleted test user: ${deleted}`);

  console.log('\n🎉 ALL CLOUD AUTH TESTS PASSED!\n');
}

runAuthTests().catch((err) => {
  console.error('\n❌ Auth test failed:', err);
  process.exit(1);
});
