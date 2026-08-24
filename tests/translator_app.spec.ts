import { test, expect } from '@playwright/test';

test.describe('Local Game Translator E2E Tests with User System & Multi-Provider AI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('1. User Authentication & Profile Management', async ({ page }) => {
    // 1. Check Sign In button in header
    const signInBtn = page.getByRole('button', { name: 'Sign In' });
    await expect(signInBtn).toBeVisible();
    await signInBtn.click();

    // 2. Expect Sign In Modal
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

    // 3. Log in with seeded default admin account
    await page.getByPlaceholder('e.g. admin or translator_alex').fill('admin');
    await page.getByPlaceholder('••••••••').fill('admin123');
    await page.locator('form').getByRole('button', { name: 'Sign In' }).click();

    // 4. Verify logged in state with admin badge
    await expect(page.getByText('Administrator')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('admin', { exact: true })).toBeVisible();

    // 5. Open User Dropdown Menu and Manage Users
    await page.getByText('Administrator').click();
    await expect(page.getByRole('button', { name: 'Manage Users' })).toBeVisible();
    await page.getByRole('button', { name: 'Manage Users' }).click();

    // 6. Verify Team & User Management View
    await expect(page.getByRole('heading', { name: 'Registered Users' })).toBeVisible();
    await expect(page.getByText('Total Registered Users')).toBeVisible();
    await expect(page.getByText('@admin')).toBeVisible();

    // 7. Add a new collaborator
    const testUsername = `user_${Date.now().toString().slice(-4)}`;
    await page.getByPlaceholder('Username (e.g. alex)').fill(testUsername);
    await page.getByPlaceholder('Password (min 4 chars)').fill('pass123');
    await page.getByPlaceholder('Display Name (optional)').fill('Test Translator');
    await page.getByRole('button', { name: 'Create' }).click();

    // 8. Verify newly created user appears in list
    await expect(page.getByText(`@${testUsername}`, { exact: true })).toBeVisible({ timeout: 5000 });

    // 9. Return to Projects dashboard
    await page.getByRole('button', { name: 'Back to Projects' }).click();
    await expect(page.getByRole('heading', { name: /Your Game Projects/ })).toBeVisible();
  });

  test('2. Multi-Provider AI Configuration Modal', async ({ page }) => {
    // Open Settings Modal
    await page.getByTitle('LLM Settings & API Keys').click();
    await expect(page.getByRole('heading', { name: /System Configuration/ })).toBeVisible();

    // 1. Verify Translation Engine Tab & Provider options
    await expect(page.getByRole('button', { name: '1. Translation Engine' })).toBeVisible();
    await expect(page.getByRole('button', { name: /OpenAI \/ Local \/ Ollama/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Google Gemini/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Anthropic Claude/ })).toBeVisible();

    // 2. Test Presets
    await page.getByRole('button', { name: 'Ollama', exact: true }).click();
    const modelInput = page.locator('input[placeholder="translategemma-12b-it or gpt-4o-mini"]');
    await expect(modelInput).toHaveValue('gemma2:9b');

    await page.getByRole('button', { name: 'Groq (Fast Cloud)' }).click();
    await expect(modelInput).toHaveValue('llama-3.3-70b-versatile');

    // 3. Switch to QA & Glossary Inspector Tab
    await page.getByRole('button', { name: '2. QA & Glossary Inspector' }).click();
    await expect(page.getByText('Audits translations for consistency')).toBeVisible();

    // 4. Switch to Tuning & Rules Tab
    await page.getByRole('button', { name: '3. Tuning & Rules' }).click();
    await expect(page.getByText('Batch Queue Concurrency')).toBeVisible();
    await expect(page.getByText('Global System Instructions')).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('3. Game Creation, Localization Workspace, and Progress Tracking', async ({ page }) => {
    const uniqueGameName = `Chronicles of Solaria ${Date.now()}`;

    // Click "New Game"
    await page.getByRole('button', { name: 'New Game' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Game Project' })).toBeVisible();

    // Fill in game details
    await page.getByPlaceholder('e.g. Chrono Odyssey, Pal Arena').fill(uniqueGameName);
    await page.getByPlaceholder('Brief summary of the game project...').fill('A high fantasy epic RPG with magical swords and ancient lore.');

    // Provide initial JSON
    const sampleJson = JSON.stringify({
      menu: {
        start: 'Start Journey',
        settings: 'Audio & Visual Settings',
      },
      dialogue: {
        npc_intro: 'Greetings, Traveler {player}! The Starblade has awakened.',
      },
    });
    await page.getByPlaceholder('{ "menu": { "play": "Start Game", "options": "Settings" } }').fill(sampleJson);

    // Submit creation inside form
    await page.locator('form').getByRole('button', { name: 'Create Game' }).click();

    // Workspace should now be active
    await expect(page.getByText(uniqueGameName)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Translations' })).toBeVisible();

    // Add Target Language
    await page.getByRole('button', { name: 'Add Language' }).click();
    await expect(page.getByRole('heading', { name: 'Add Target Language' })).toBeVisible();

    // Click Spanish preset
    await page.getByRole('button', { name: 'Spanish (Spain) (es-ES)' }).click();
    await page.locator('form').getByRole('button', { name: 'Add Language' }).click();

    // Target language tab should appear
    await expect(page.getByRole('button', { name: /Spanish \(Spain\)/ }).first()).toBeVisible({ timeout: 5000 });

    // Verify progress bar and key list
    await expect(page.getByText('Translation Completion')).toBeVisible();
    await expect(page.getByText('menu.start')).toBeVisible();
    await expect(page.getByText('dialogue.npc_intro')).toBeVisible();

    // Manually edit a translation
    const translationTextareas = page.locator('textarea[placeholder="Enter translation..."]');
    await translationTextareas.first().fill('Iniciar Viaje');
    await translationTextareas.first().blur(); // Triggers auto-save

    // Check that completion increased
    await expect(page.getByText('1 Translated')).toBeVisible({ timeout: 5000 });
  });

  test('4. Glossary Management & AI Inspector Navigation', async ({ page }) => {
    // Wait for games to load and click Open Workspace on first game
    await page.getByRole('button', { name: 'Open Workspace' }).first().click();

    // Switch to Glossary tab
    await page.locator('header').getByRole('button', { name: /Glossary/i }).click();
    await expect(page.getByRole('heading', { name: 'Game Terminology Glossary' })).toBeVisible();

    // Add a glossary term
    await page.getByRole('button', { name: 'Add Term' }).click();
    await expect(page.getByRole('heading', { name: 'Add Glossary Term' })).toBeVisible();

    await page.getByPlaceholder('e.g. Starblade, Lord Malakor').fill('Starblade');
    await page.getByPlaceholder('e.g. Espada Estelar, 滅びの剣').fill('Espada Estelar');
    await page.locator('select').selectOption('Item');
    await page.getByPlaceholder('e.g. Do not translate as common sword; always capitalize').fill('Legendary ancient weapon');
    await page.locator('form').getByRole('button', { name: 'Add Term' }).click();

    // Verify term appears in table
    await expect(page.getByText('Starblade')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Espada Estelar')).toBeVisible();

    // Switch to AI QA & Inspector tab
    await page.getByRole('button', { name: 'AI QA & Inspector' }).click();
    await expect(page.getByText('Google Gemini Terminology & QA Inspector')).toBeVisible();
  });

  test('5. Custom Schema Mapping Wizard (Array of objects)', async ({ page }) => {
    const customGameName = `Custom Schema Game ${Date.now()}`;

    // Create game
    await page.getByRole('button', { name: 'New Game' }).click();
    await page.getByPlaceholder('e.g. Chrono Odyssey, Pal Arena').fill(customGameName);
    await page.locator('form').getByRole('button', { name: 'Create Game' }).click();

    // Open Import Base JSON wizard
    await page.getByRole('button', { name: 'Import Base JSON' }).click();
    await expect(page.getByRole('heading', { name: 'Import Base Reference JSON' })).toBeVisible();

    // Paste an array of objects with metadata
    const complexJson = JSON.stringify([
      {
        id: 'quest_sword_01',
        speaker: 'Elder Garrow',
        text: 'Retrieve the Solaris Blade from the Crypt.',
        audio_clip: 9021,
        gold_reward: 500,
      },
    ]);

    await page.getByPlaceholder(/\[ { "id": "quest_01"/).fill(complexJson);

    // Click Next to open Schema Mapping step
    await page.getByRole('button', { name: 'Next: Configure Structure & Mapping' }).click();

    // Expect schema mapping view and preserved attributes badge
    await expect(page.getByText('Import Structure Mode')).toBeVisible();
    await expect(page.getByText('audio_clip, gold_reward (Preserved)').first()).toBeVisible();

    // Confirm & Import
    await page.getByRole('button', { name: 'Confirm & Import Keys' }).click();
    await expect(page.getByText('Successfully imported 1 base reference keys')).toBeVisible({ timeout: 5000 });
  });
});
