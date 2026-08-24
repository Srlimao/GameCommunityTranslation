import { JsonSchemaDetector } from './features/games/json_schema_detector.ts';
import { JsonStructureParser } from './features/games/json_structure_parser.ts';
import { GamesRepository } from './features/games/games_repository.ts';
import { TranslationsRepository } from './features/translations/translations_repository.ts';

async function testDictionaryWithTranslationsArray() {
  console.log('🧪 Testing Dictionary with Translations Array (e.g. Starsand Island format)...');

  const starsandJson = {
    Title: 'en',
    Translations: [
      {
        Key: '$$$$NPCAffection.ExtraNotice$$',
        Version: 1,
        Value: '(Bonus)',
      },
      {
        Key: '$$$$UIReport_FailDescriptionIsSensitiveWord$$',
        Version: 1,
        Value: 'Description contains sensitive words.',
      },
      {
        Key: '$$$$Item_Starsand_Description$$',
        Version: 2,
        Value: 'A glowing vial of sand from the celestial desert.',
      },
    ],
  };

  // 1. Analyze structure
  const analysis = JsonSchemaDetector.analyze(starsandJson);
  console.log('✅ Structure Type detected:', analysis.structureType);
  console.log('   Detected List Paths:', analysis.detectedListPaths);
  console.log('   Selected List Path:', analysis.selectedListPath);
  console.log('   Suggested Key Field:', analysis.suggestedKeyField);
  console.log('   Suggested Text Fields:', analysis.suggestedTextFields);
  console.log('   Available Fields:', analysis.availableFields);

  if (analysis.selectedListPath !== 'Translations') {
    throw new Error(`Expected selectedListPath to be 'Translations', got ${analysis.selectedListPath}`);
  }
  if (analysis.suggestedKeyField !== 'Key') {
    throw new Error(`Expected suggestedKeyField to be 'Key', got ${analysis.suggestedKeyField}`);
  }
  if (!analysis.suggestedTextFields.includes('Value')) {
    throw new Error(`Expected suggestedTextFields to contain 'Value', got ${analysis.suggestedTextFields}`);
  }

  // 2. Flatten keys
  const schemaConfig = {
    mode: 'array_of_objects' as const,
    rootPath: 'Translations',
    keyField: 'Key',
    textFields: ['Value'],
  };

  const flattened = JsonStructureParser.flattenWithConfig(starsandJson, schemaConfig);
  console.log(`✅ Extracted ${flattened.length} keys:`);
  flattened.forEach(f => console.log(`   - Key: "${f.keyPath}" => Text: "${f.sourceText}"`));

  if (flattened[0].keyPath !== '$$$$NPCAffection.ExtraNotice$$' || flattened[0].sourceText !== '(Bonus)') {
    throw new Error('Key path or source text extraction failed');
  }

  // 3. Create Game & Import
  const game = GamesRepository.create({
    name: 'Starsand Island',
    base_language: 'en-US',
  });

  const rawStr = JSON.stringify(starsandJson);
  const schemaStr = JSON.stringify(schemaConfig);
  GamesRepository.importBaseKeys(game.id, flattened, rawStr, schemaStr);

  // 4. Translate keys to Spanish
  const lang = TranslationsRepository.addLanguage(game.id, 'es-ES', 'Spanish');
  const baseKeys = GamesRepository.getBaseKeys(game.id);

  const k1 = baseKeys.find(k => k.key_path === '$$$$NPCAffection.ExtraNotice$$');
  if (k1) {
    TranslationsRepository.updateTranslation({
      keyId: k1.id,
      languageId: lang.id,
      translatedText: '(Bonificación)',
      status: 'approved',
    });
  }

  const k2 = baseKeys.find(k => k.key_path === '$$$$UIReport_FailDescriptionIsSensitiveWord$$');
  if (k2) {
    TranslationsRepository.updateTranslation({
      keyId: k2.id,
      languageId: lang.id,
      translatedText: 'La descripción contiene palabras sensibles.',
      status: 'approved',
    });
  }

  // 5. Reconstruct target JSON
  const exportMap = TranslationsRepository.getExportMap(game.id, 'es-ES');
  const reconstructed = JsonStructureParser.unflattenWithTemplate(exportMap, rawStr, schemaStr);

  console.log('✅ Reconstructed target JSON:', JSON.stringify(reconstructed, null, 2));

  // Assertions
  if (reconstructed.Title !== 'en') {
    throw new Error('Root property Title was lost!');
  }
  if (!Array.isArray(reconstructed.Translations) || reconstructed.Translations.length !== 3) {
    throw new Error('Translations array structure was corrupted!');
  }
  if (reconstructed.Translations[0].Key !== '$$$$NPCAffection.ExtraNotice$$' || reconstructed.Translations[0].Version !== 1) {
    throw new Error('Key or Version metadata inside Translations[0] was corrupted!');
  }
  if (reconstructed.Translations[0].Value !== '(Bonificación)') {
    throw new Error('Translated text was not injected into Translations[0].Value!');
  }

  console.log('🎉 ALL DICTIONARY WRAPPER & STARSAND ISLAND TESTS PASSED!');
}

testDictionaryWithTranslationsArray().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
