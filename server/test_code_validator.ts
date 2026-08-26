import { CodeValidator } from '../client/src/features/gemini_qa/code_validator.ts';
import { KeyTranslationItem } from '../client/src/types/client_types.ts';

function runTests() {
  console.log('=== Running Code Validator Tests ===');

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
    // 3. Markup tag mismatch test
    {
      id: '3',
      key_id: 'k3',
      key_path: 'SKILL_FIRE',
      source_text: '<color=#FF0000><b>Fire Blast</b></color>',
      translated_text: '<color=#FF0000>Explosão de Fogo',
      language_id: 'l1',
      language_code: 'pt-BR',
      order_index: 2,
      status: 'ai_translated',
    },
    // 4. Clean matching item
    {
      id: '4',
      key_id: 'k4',
      key_path: 'CLEAN_ITEM',
      source_text: '\t{user} pressed [E] to activate <color=yellow>Radar</color>:',
      translated_text: '\t{user} pressionou [E] para ativar <color=yellow>Radar</color>:',
      language_id: 'l1',
      language_code: 'pt-BR',
      order_index: 3,
      status: 'ai_translated',
    },
  ];

  const result = CodeValidator.validateAll(testItems);
  console.log('Validation Summary:', JSON.stringify(result.summary, null, 2));

  // Assertions
  if (result.summary.totalChecked !== 4) {
    throw new Error(`Expected 4 items checked, got ${result.summary.totalChecked}`);
  }
  if (result.summary.cleanCount !== 1) {
    throw new Error(`Expected 1 clean item, got ${result.summary.cleanCount}`);
  }
  if (result.summary.tabMismatches < 1) {
    throw new Error(`Expected at least 1 tab mismatch, got ${result.summary.tabMismatches}`);
  }
  if (result.summary.symbolMismatches < 1 && result.summary.bracketMismatches < 1) {
    throw new Error('Expected symbol/bracket mismatches');
  }

  console.log('Detected Issues Count:', result.issues.length);
  for (const issue of result.issues) {
    console.log(`- [${issue.issue_type}] ${issue.key_path}: ${issue.message}`);
    console.log(`  Suggestion: "${issue.suggestion}"`);
  }

  console.log('✅ ALL CODE VALIDATOR TESTS PASSED!');
}

runTests();
