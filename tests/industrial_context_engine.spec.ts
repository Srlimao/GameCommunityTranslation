import { test, expect } from '@playwright/test';
import { cleanupTestArtifacts } from './test_cleanup_helper.ts';

test.describe('Industrial Technical Dark Mode & Advanced Context Engine E2E Tests', () => {
  test.beforeAll(async () => {
    await cleanupTestArtifacts();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.afterAll(async () => {
    await cleanupTestArtifacts();
  });

  test('1. Developer Console Aesthetic, Left Sidebar & Context-First Dashboard Verification', async ({ page }) => {
    // 1. Check Dev Console banner and system status tags
    await expect(page.getByText('CONTEXT-FIRST TRANSLATION WORKFLOW')).toBeVisible();
    await expect(page.getByText('Global Context & Rules Engine')).toBeVisible();

    // 2. Check left sidebar navigation
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole('button', { name: /Dashboard/i })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: /Projects/i })).toBeVisible();

    // 3. Check 4 Context-First hero cards
    await expect(page.getByText('Lore Repository')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Character Voice' })).toBeVisible();
    await expect(page.getByText('Glossary Terms')).toBeVisible();
    await expect(page.getByText('Style Guide Rules')).toBeVisible();

    // 4. Verify Projects dashboard section
    await expect(page.getByRole('heading', { name: /Your Game Projects/ })).toBeVisible();
  });

  test('2. Global Context Hub: Structured Lore Elements, Weighting & Injection Targets', async ({ page }) => {
    const gameName = `Aetheria Lore Hub ${Date.now()}`;

    // Create game
    await page.getByRole('button', { name: /NEW GAME|Create Game/i }).first().click();
    await page.getByPlaceholder('e.g. Chrono Odyssey, Pal Arena').fill(gameName);
    await page.locator('form').getByRole('button', { name: 'Create Game' }).click();

    // Navigate to Big Context & Lore tab
    await page.getByRole('button', { name: 'BIG CONTEXT & LORE' }).click();

    // Switch to Lore table module view
    await page.getByRole('button', { name: /LORE \(\d+\)/ }).click();
    await expect(page.getByText('Global Context Hub')).toBeVisible();

    // Add a critical lore element
    await page.getByRole('button', { name: 'ADD LORE ELEMENT' }).click();
    await page.getByPlaceholder('e.g. Aethelgard Realm or Mana Core').fill('Celestial Aether Core');
    await page.locator('form select').first().selectOption('Magic/Tech');
    await page.locator('form select').filter({ hasText: /CRITICAL|HIGH/ }).selectOption('critical');
    await page.getByPlaceholder('Provide background lore, naming rules, pronunciation, and contextual nuance...').fill(
      'Ancient glowing relic powering the floating citadel. Always capitalize as Celestial Core.'
    );
    await page.getByRole('button', { name: 'SAVE ELEMENT' }).click();

    // Verify it appears in structured table
    const loreRow = page.getByRole('row', { name: /Celestial Aether Core/ });
    await expect(loreRow).toBeVisible();
    await expect(loreRow.getByText('Magic/Tech')).toBeVisible();
    await expect(loreRow.locator('select').first()).toHaveValue('critical');
  });

  test('3. Character Binder: Persona Cards, Formality Registers & Dialogue Samples', async ({ page }) => {
    // Open first game workspace
    await page.getByRole('button', { name: 'Open Workspace' }).first().click();

    // Switch to Big Context tab
    await page.getByRole('button', { name: 'BIG CONTEXT & LORE' }).click();

    // Switch to Characters module
    await page.getByRole('button', { name: /CHARACTERS \(\d+\)/ }).click();
    await expect(page.getByText('Character Binder & Voice Dossiers')).toBeVisible();

    // Add character dossier
    await page.getByRole('button', { name: 'ADD CHARACTER' }).click();
    await page.getByPlaceholder('e.g. Lady Katherine or Grimjaw').fill('Grand Inquisitor Thorne');
    await page.getByPlaceholder('e.g. Royal High Mage or Smuggler').fill('High Judge of the Sun Tribunal');
    await page.locator('select').filter({ hasText: /FORMAL/ }).selectOption('archaic');
    await page.getByPlaceholder(/Uses seafaring metaphors/).fill('Speaks in austere archaic decrees, never uses slang.');
    await page.getByPlaceholder(/By the celestial tides/).fill('Halt in the name of the Solar Tribunal, heretic!');
    await page.getByRole('button', { name: 'SAVE CHARACTER DOSSIER' }).click();

    // Verify character card renders with register badge & sample dialogue
    await expect(page.getByText('Grand Inquisitor Thorne')).toBeVisible();
    await expect(page.getByText('High Judge of the Sun Tribunal')).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^archaic$/i })).toBeVisible();
    await expect(page.getByText('"Halt in the name of the Solar Tribunal, heretic!"')).toBeVisible();
  });

  test('4. Style Guide Engine: Localization Matrices & Gender/Punctuation Rules', async ({ page }) => {
    // Open first game workspace
    await page.getByRole('button', { name: 'Open Workspace' }).first().click();

    // Switch to Big Context tab
    await page.getByRole('button', { name: 'BIG CONTEXT & LORE' }).click();

    // Switch to Style Guide module
    await page.getByRole('button', { name: 'STYLE GUIDE' }).click();
    await expect(page.getByText('Style Guide Engine & Localization Matrices')).toBeVisible();
    await expect(page.getByText('RULES ACTIVE')).toBeVisible();

    // Select Spanish Inverted Punctuation
    const punctuationSelect = page.locator('select').filter({ hasText: /Standard Western Quotes/ });
    await punctuationSelect.selectOption('spanish_inverted');

    // Add custom locale rules
    const customRulesArea = page.locator('textarea[placeholder*="Add custom locale constraints"]');
    await customRulesArea.fill('Never translate weapon titles containing Starforge; use inverted punctuation in Spanish.');

    // Save Context changes
    await page.getByRole('button', { name: 'COMMIT CONTEXT' }).click();
    await expect(page.getByText('SAVED')).toBeVisible({ timeout: 5000 });
  });

  test('5. 4-Column Ecosystem Hub & LLM Synthesizer Pipeline', async ({ page }) => {
    // Open first game workspace
    await page.getByRole('button', { name: 'Open Workspace' }).first().click();

    // Switch to Big Context tab
    await page.getByRole('button', { name: 'BIG CONTEXT & LORE' }).click();

    // Switch to Full Ecosystem view (4-Col)
    await page.getByRole('button', { name: 'ECOSYSTEM (4-COL)' }).click();

    // Verify all 4 Ecosystem columns exist
    await expect(page.getByText('Global Context Hub')).toBeVisible();
    await expect(page.getByText('Lore Audit Log')).toBeVisible();
    await expect(page.getByText('Character Binder & Voice Dossiers')).toBeVisible();
    await expect(page.getByText('Advanced Glossary Tool')).toBeVisible();
    await expect(page.getByText('LLM Context Synthesizer & Pipeline Preview')).toBeVisible();
    await expect(page.getByText('Style Guide Engine & Localization Matrices')).toBeVisible();

    // Verify token metrics calculation
    await expect(page.getByText(/Chars:/)).toBeVisible();
    await expect(page.getByText(/Est. Tokens:/)).toBeVisible();
  });

  test('6. Data-Driven Translation Workspace: AI Inheritance Pipeline Panel & Tree Explorer', async ({ page }) => {
    // Open first game workspace
    await page.getByRole('button', { name: 'Open Workspace' }).first().click();

    // Verify AI Inheritance Panel is present
    await expect(page.getByText('AI Inheritance Pipeline')).toBeVisible();
    await expect(page.getByText(/LORE:/)).toBeVisible();
    await expect(page.getByText(/VOICES:/)).toBeVisible();
    await expect(page.getByText(/STYLE:/)).toBeVisible();

    // Ensure a target language is present
    const addLangBtn = page.getByRole('button', { name: 'ADD TARGET LOCALE' });
    if (await addLangBtn.isVisible()) {
      await addLangBtn.click();
      await page.getByRole('button', { name: 'Spanish (Spain) (es-ES)' }).click();
      await page.locator('form').getByRole('button', { name: 'Add Language' }).click();
    }

    // Verify Tree Explorer is present on the left
    await expect(page.getByText('Tree Explorer')).toBeVisible();
    await expect(page.getByText('ALL KEYS')).toBeVisible();
    await expect(page.getByPlaceholder('Search namespaces...')).toBeVisible();

    // Expand AI Inheritance details
    await page.getByRole('button', { name: /Inspect Directives|Collapse/ }).click();
    await expect(page.getByText(/Inherited Lore/)).toBeVisible();
    await expect(page.getByText(/Character Voices/)).toBeVisible();
    await expect(page.getByText(/Glossary Directives/)).toBeVisible();
  });
});
