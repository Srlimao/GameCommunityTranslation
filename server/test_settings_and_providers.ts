import { SettingsRepository } from './features/settings/settings_repository.ts';
import { AIService } from './features/ai_providers/ai_service.ts';

async function runTest() {
  console.log('🧪 Testing Multi-Provider Settings Repository...');

  // 1. Fetch initial settings
  const initial = SettingsRepository.getSettings();
  console.log('1. Initial Settings:');
  console.log('   - Translation Provider:', initial.translation_provider);
  console.log('   - Translation Model:', initial.translation_model);
  console.log('   - Translation Base URL:', initial.translation_base_url);
  console.log('   - QA Provider:', initial.qa_provider);
  console.log('   - Batch Concurrency:', initial.batch_concurrency);

  // 2. Update settings
  console.log('\n2. Updating Settings to multi-provider test values...');
  const updated = SettingsRepository.updateSettings({
    translation_provider: 'openai_compatible',
    translation_base_url: 'https://api.groq.com/openai/v1',
    translation_model: 'llama-3.3-70b-versatile',
    translation_temperature: 0.15,
    qa_provider: 'gemini',
    qa_model: 'gemini-2.5-flash',
    batch_concurrency: 4,
    custom_system_prompt: 'Test Global Constraint: Preserve RPG tone.',
  });

  console.log('   - Updated Translation Model:', updated.translation_model);
  console.log('   - Updated Translation Base URL:', updated.translation_base_url);
  console.log('   - Updated Batch Concurrency:', updated.batch_concurrency);
  console.log('   - Updated System Prompt:', updated.custom_system_prompt);

  // 3. Verify persistence
  const reloaded = SettingsRepository.getSettings();
  if (
    reloaded.translation_model !== 'llama-3.3-70b-versatile' ||
    reloaded.batch_concurrency !== 4 ||
    reloaded.translation_temperature !== 0.15
  ) {
    throw new Error('Settings persistence verification failed!');
  }
  console.log('✅ Settings persisted and reloaded successfully in SQLite!');

  // 4. Test provider instances
  console.log('\n3. Testing Provider Dispatcher...');
  const geminiProv = AIService.getProviderInstance('gemini');
  const openaiProv = AIService.getProviderInstance('openai_compatible');
  const anthropicProv = AIService.getProviderInstance('anthropic');

  if (!geminiProv || !openaiProv || !anthropicProv) {
    throw new Error('Failed to instantiate AI providers!');
  }
  console.log('✅ All AI Providers (Gemini, OpenAI-compatible, Anthropic) initialized correctly.');

  // 5. Test connection error handling when key is missing (safe check)
  console.log('\n4. Testing Provider Connection Validation (Missing credentials safety check)...');
  const testGemini = await AIService.testProvider('gemini', { apiKey: '' });
  console.log('   - Gemini without key result:', testGemini.success === false ? 'Correctly rejected' : 'Unexpected');
  if (testGemini.success !== false) throw new Error('Expected missing API key to fail gracefully');

  const testAnthropic = await AIService.testProvider('anthropic', { apiKey: '' });
  console.log('   - Anthropic without key result:', testAnthropic.success === false ? 'Correctly rejected' : 'Unexpected');
  if (testAnthropic.success !== false) throw new Error('Expected missing API key to fail gracefully');

  console.log('\n🎉 ALL AI SETTINGS & PROVIDER TESTS PASSED!');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
