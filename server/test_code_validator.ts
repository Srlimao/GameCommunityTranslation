import { CodeValidator } from '../client/src/features/gemini_qa/code_validator.ts';
import { KeyTranslationItem } from '../client/src/types/client_types.ts';
import { GamesRepository } from './features/games/games_repository.ts';

function runTests() {
  console.log('=== Running Code Validator & Whitelist Tests ===');

  // Test 1: Tag Extraction from base texts
  const sampleBaseTexts = [
    'I enjoy explosions, but that <b>Fire</> <b>King</> is strong!',
    '<color=#FF0000>Danger: [HP] is low!</color>',
    'Press <rare>Action</rare> to begin',
  ];
  const extractedTags = GamesRepository.extractTagsFromTexts(sampleBaseTexts);
  console.log('Extracted Whitelist Tags:', extractedTags);
  if (!extractedTags.includes('<b>') || !extractedTags.includes('</>') || !extractedTags.includes('<color=#FF0000>')) {
    throw new Error('Tag extraction failed to find expected tags');
  }

  const testItems: KeyTranslationItem[] = [
    // 1. Tab mismatch test
    {
      id: '1',
      key_id: 'k1',
      key_path: 'UI_TAB_1',
      source_text: '\t\tInventory Item',
      translated_text: 'Item do Inventario',
      language_id: 'l1',
      language_code: 'pt-BR',
      order_index: 0,
      status: 'ai_translated',
    },
    // 2. Placeholder mismatch test
    {
      id: '2',
      key_id: 'k2',
      key_path: 'DIALOGUE_HERO',
      source_text: 'Hello {player_name}, you have {gold_count} coins and %s potion.',
      translated_text: 'Olá {player_name}, você tem moedas e %s poção.',
      language_id: 'l1',
      language_code: 'pt-BR',
      order_index: 1,
      status: 'ai_translated',
    },
    // 3. Valid restructured sentence with whitelist tags (should NOT fail)
    {
      id: '3',
      key_id: 'k3',
      key_path: 'RESTRUCTURED_VALID',
      source_text: 'Press <color=yellow>Radar</color> and <color=yellow>Scan</color>',
      translated_text: 'Pressione <color=yellow>Radar e Scan</color>', // Rephrased in PT-BR with valid tags
      language_id: 'l1',
      language_code: 'pt-BR',
      order_index: 2,
      status: 'ai_translated',
    },
    // 4. Unreal engine shorthand tags and corrupted backslash escapes (User case - should FAIL and be caught)
    {
      id: '4',
      key_id: 'k4',
      key_path: 'DIALOGUE_CORRUPTED_TAGS',
      source_text: 'I enjoy a bit of explosions, but that <b>Fire</> <b>King</> might be enjoying it a wee much...',
      translated_text: 'Eu curto umas explosões, mas aquele <b\\>Rei</\\> <b\\>Fogo</\\> pode estar gostando um tantinho demais...',
      language_id: 'l1',
      language_code: 'pt-BR',
      order_index: 3,
      status: 'ai_translated',
    },
    // 5. Clean matching item
    {
      id: '5',
      key_id: 'k5',
      key_path: 'CLEAN_ITEM',
      source_text: '\t{user} pressed [E] to activate <color=yellow>Radar</color>:',
      translated_text: '\t{user} pressionou [E] para ativar <color=yellow>Radar</color>:',
      language_id: 'l1',
      language_code: 'pt-BR',
      order_index: 4,
      status: 'ai_translated',
    },
    // 6. Untranslated item (empty) - should NOT inflate clean count
    {
      id: '6',
      key_id: 'k6',
      key_path: 'UNTRANSLATED_ITEM_EMPTY',
      source_text: 'Talk to blacksmith',
      translated_text: '',
      language_id: 'l1',
      language_code: 'pt-BR',
      order_index: 5,
      status: 'untranslated',
    },
    // 7. Identical to base source copy (suspect untranslated)
    {
      id: '7',
      key_id: 'k7',
      key_path: 'IDENTICAL_COPY',
      source_text: 'Welcome to the ancient kingdom of Eldoria',
      translated_text: 'Welcome to the ancient kingdom of Eldoria',
      language_id: 'l1',
      language_code: 'pt-BR',
      order_index: 6,
      status: 'ai_translated',
    },
  ];

  const whitelist = ['<b>', '</b>', '</>', '<color=yellow>', '</color>', '<rare>', '</rare>'];
  const result = CodeValidator.validateAll(testItems, whitelist);
  console.log('Validation Summary with Whitelist:', JSON.stringify(result.summary, null, 2));

  // Assertions
  // Total checked should be 7
  if (result.summary.totalChecked !== 7) {
    throw new Error(`Expected 7 items checked, got ${result.summary.totalChecked}`);
  }
  // Translated items: 6 items (item 6 is untranslated/empty).
  // Issues: k1 (tab), k2 (placeholder/symbol), k4 (tag), k7 (identical).
  // Clean translated items: RESTRUCTURED_VALID + CLEAN_ITEM = 2 clean items
  if (result.summary.cleanCount !== 2) {
    throw new Error(`Expected 2 clean items (untranslated item 6 must not count as clean), got ${result.summary.cleanCount}`);
  }
  if (result.summary.tabMismatches < 1) {
    throw new Error(`Expected at least 1 tab mismatch, got ${result.summary.tabMismatches}`);
  }
  if (result.summary.tagMismatches !== 1) {
    throw new Error(`Expected exactly 1 tag mismatch (DIALOGUE_CORRUPTED_TAGS), got ${result.summary.tagMismatches}`);
  }
  if (result.summary.identicalToSourceCount !== 1) {
    throw new Error(`Expected 1 identicalToSourceCount, got ${result.summary.identicalToSourceCount}`);
  }

  // Check specific fix for user case
  const userCaseIssue = result.issues.find((i) => i.key_path === 'DIALOGUE_CORRUPTED_TAGS');
  if (!userCaseIssue) {
    throw new Error('Expected DIALOGUE_CORRUPTED_TAGS issue to be found');
  }
  if (userCaseIssue.issue_type !== 'tag_mismatch') {
    throw new Error(`Expected tag_mismatch issue type, got ${userCaseIssue.issue_type}`);
  }
  console.log('User case suggestion:', userCaseIssue.suggestion);
  if (
    userCaseIssue.suggestion !==
    'Eu curto umas explosões, mas aquele <b>Rei</> <b>Fogo</> pode estar gostando um tantinho demais...'
  ) {
    throw new Error(`Unexpected suggestion for user case: ${userCaseIssue.suggestion}`);
  }

  console.log('Detected Issues Count:', result.issues.length);
  for (const issue of result.issues) {
    console.log(`- [${issue.issue_type}] ${issue.key_path}: ${issue.message}`);
    console.log(`  Suggestion: "${issue.suggestion}"`);
  }

  console.log('✅ ALL CODE VALIDATOR & WHITELIST TESTS PASSED!');
}

runTests();
