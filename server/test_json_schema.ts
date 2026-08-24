import { GamesRepository } from './features/games/games_repository.ts';
import { TranslationsRepository } from './features/translations/translations_repository.ts';
import { JsonSchemaDetector } from './features/games/json_schema_detector.ts';
import { JsonStructureParser } from './features/games/json_structure_parser.ts';

async function testJsonSchemaCustomization() {
  console.log('🧪 Testing Flexible JSON Schema Detection, Mapping & Export...');

  // 1. Array of dialogue objects with metadata
  const dialogueArray = [
    {
      id: 'guard_warning',
      speaker: 'Gatekeeper Brian',
      text: 'Halt! The city gates are sealed by order of Lord Malakor.',
      audio_id: 8801,
      flags: ['night_only', 'alert_guard'],
      camera_angle: 45,
    },
    {
      id: 'player_response',
      speaker: 'Player Character',
      text: 'I carry the Royal Crest of Eldoria.',
      audio_id: 8802,
      flags: ['diplomatic'],
      camera_angle: 30,
    },
  ];

  // 2. Test Auto Detection
  const analysis = JsonSchemaDetector.analyze(dialogueArray);
  console.log('✅ Auto-detected structure:', analysis.structureType);
  console.log('   Suggested Key Field:', analysis.suggestedKeyField);
  console.log('   Suggested Text Field(s):', analysis.suggestedTextFields);
  console.log('   Suggested Context Field:', analysis.suggestedContextField);
  console.log('   Available Fields:', analysis.availableFields);

  if (analysis.suggestedKeyField !== 'id' || !analysis.suggestedTextFields.includes('text') || analysis.suggestedContextField !== 'speaker') {
    throw new Error('Auto-detection heuristics failed!');
  }

  // 3. Create game and import with schema config
  const game = GamesRepository.create({
    name: 'Gate of Eldoria',
    context_prompt: 'High fantasy city gate dialogue scene.',
  });

  const schemaConfig = {
    mode: 'array_of_objects' as const,
    keyField: 'id',
    textFields: ['text'],
    contextField: 'speaker',
  };

  const flattened = JsonStructureParser.flattenWithConfig(dialogueArray, schemaConfig);
  console.log(`✅ Flattened ${flattened.length} keys:`);
  flattened.forEach(f => console.log(`   - Key: ${f.keyPath} | Text: "${f.sourceText}" | Context Note: "${f.contextNote}"`));

  const rawJsonStr = JSON.stringify(dialogueArray);
  const schemaStr = JSON.stringify(schemaConfig);
  GamesRepository.importBaseKeys(game.id, flattened, rawJsonStr, schemaStr);

  // 4. Add Spanish language & simulate translation
  const lang = TranslationsRepository.addLanguage(game.id, 'es-ES', 'Spanish');
  const baseKeys = GamesRepository.getBaseKeys(game.id);

  const k1 = baseKeys.find(k => k.key_path === 'guard_warning');
  if (k1) {
    TranslationsRepository.updateTranslation({
      keyId: k1.id,
      languageId: lang.id,
      translatedText: '¡Alto! Las puertas de la ciudad están selladas por orden de Lord Malakor.',
      status: 'approved',
    });
  }

  const k2 = baseKeys.find(k => k.key_path === 'player_response');
  if (k2) {
    TranslationsRepository.updateTranslation({
      keyId: k2.id,
      languageId: lang.id,
      translatedText: 'Llevo el Emblema Real de Eldoria.',
      status: 'approved',
    });
  }

  // 5. Test Target JSON Reconstruction
  const exportMap = TranslationsRepository.getExportMap(game.id, 'es-ES');
  const reconstructed = JsonStructureParser.unflattenWithTemplate(exportMap, rawJsonStr, schemaStr);

  console.log('✅ Reconstructed target JSON:', JSON.stringify(reconstructed, null, 2));

  // Assertions
  if (!Array.isArray(reconstructed) || reconstructed.length !== 2) {
    throw new Error('Reconstruction is not an array with 2 items');
  }
  if (reconstructed[0].audio_id !== 8801 || reconstructed[0].camera_angle !== 45 || reconstructed[0].speaker !== 'Gatekeeper Brian') {
    throw new Error('Non-translated metadata attributes were corrupted!');
  }
  if (reconstructed[0].text !== '¡Alto! Las puertas de la ciudad están selladas por orden de Lord Malakor.') {
    throw new Error('Translation was not injected properly!');
  }

  console.log('🎉 ALL JSON SCHEMA ADAPTATION TESTS PASSED!');
}

testJsonSchemaCustomization().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
