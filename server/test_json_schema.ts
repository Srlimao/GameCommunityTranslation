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

  // ==========================================
  // 6. Test Grouped String Tables (.uasset JSON)
  // ==========================================
  console.log('\n🧪 Testing Grouped String Tables (.uasset multi-table dictionary)...');

  const uassetJson = {
    "Dialogues/LocTable_AllDialogues.uasset": {
      "greenbeard_OpeningGB_D01_L01": "That was a very <b>dangerous</> thing you did! What were you thinking...",
      "greenbeard_OpeningGB_D01_L02": "...Fell down, you say? Lucky I found you and <b>revived</> you here."
    },
    "LocTable_ArenaLevel.uasset": {
      "arena_Arena1_name": "Carrot Farm",
      "arena_Arena1_desc": "You unlock a new arena, <b>Carrot Farm</>."
    }
  };

  // Test detection
  const uassetAnalysis = JsonSchemaDetector.analyze(uassetJson);
  console.log('✅ Auto-detected structure for .uasset JSON:', uassetAnalysis.structureType);
  console.log('   Total keys counted:', uassetAnalysis.totalItemsCount);
  console.log('   Detected tables:', uassetAnalysis.detectedListPaths.map(p => `${p.path} (${p.count} strings)`).join(', '));
  console.log('   First sample item:', uassetAnalysis.samplePreview[0]);

  if (uassetAnalysis.structureType !== 'grouped_dictionary') {
    throw new Error(`Expected structureType to be 'grouped_dictionary', got '${uassetAnalysis.structureType}'`);
  }
  if (uassetAnalysis.totalItemsCount !== 4) {
    throw new Error(`Expected totalItemsCount to be 4, got ${uassetAnalysis.totalItemsCount}`);
  }
  if (uassetAnalysis.samplePreview[0].contextNote !== 'Dialogues/LocTable_AllDialogues.uasset') {
    throw new Error(`Expected sample contextNote to be 'Dialogues/LocTable_AllDialogues.uasset', got '${uassetAnalysis.samplePreview[0].contextNote}'`);
  }

  // Test flattening
  const uassetSchemaConfig = {
    mode: 'grouped_dictionary' as const,
    textFields: ['_value'],
  };
  const uassetFlattened = JsonStructureParser.flattenWithConfig(uassetJson, uassetSchemaConfig);
  console.log(`✅ Flattened ${uassetFlattened.length} grouped keys:`);
  uassetFlattened.forEach(f => console.log(`   - Key: ${f.keyPath} | Text: "${f.sourceText}" | Context: "${f.contextNote}"`));

  if (uassetFlattened.length !== 4) {
    throw new Error(`Expected 4 flattened items, got ${uassetFlattened.length}`);
  }
  if (!uassetFlattened.some(f => f.keyPath === 'Dialogues/LocTable_AllDialogues.uasset.greenbeard_OpeningGB_D01_L01')) {
    throw new Error('Missing expected flattened keyPath for dialogue line!');
  }

  // Test database import & reconstruction
  const uassetGame = GamesRepository.create({
    name: 'Funguys Swarm Game',
    context_prompt: 'Roguelike adventure dialogue and UI strings.',
  });

  const uassetRawStr = JSON.stringify(uassetJson, null, 2);
  const uassetSchemaStr = JSON.stringify(uassetSchemaConfig);
  GamesRepository.importBaseKeys(uassetGame.id, uassetFlattened, uassetRawStr, uassetSchemaStr);

  const frLang = TranslationsRepository.addLanguage(uassetGame.id, 'fr-FR', 'French');
  const uassetBaseKeys = GamesRepository.getBaseKeys(uassetGame.id);

  const gbKey = uassetBaseKeys.find(k => k.key_path === 'Dialogues/LocTable_AllDialogues.uasset.greenbeard_OpeningGB_D01_L01');
  if (gbKey) {
    TranslationsRepository.updateTranslation({
      keyId: gbKey.id,
      languageId: frLang.id,
      translatedText: "C'était une chose très <b>dangereuse</> à faire ! À quoi pensiez-vous...",
      status: 'approved',
    });
  }

  const arenaKey = uassetBaseKeys.find(k => k.key_path === 'LocTable_ArenaLevel.uasset.arena_Arena1_name');
  if (arenaKey) {
    TranslationsRepository.updateTranslation({
      keyId: arenaKey.id,
      languageId: frLang.id,
      translatedText: "Ferme de carottes",
      status: 'approved',
    });
  }

  const uassetExportMap = TranslationsRepository.getExportMap(uassetGame.id, 'fr-FR');
  const uassetReconstructed = JsonStructureParser.unflattenWithTemplate(uassetExportMap, uassetRawStr, uassetSchemaStr);

  console.log('✅ Reconstructed target .uasset JSON:', JSON.stringify(uassetReconstructed, null, 2));

  if (!uassetReconstructed['Dialogues/LocTable_AllDialogues.uasset'] || !uassetReconstructed['LocTable_ArenaLevel.uasset']) {
    throw new Error('Table keys were corrupted or missing in reconstruction!');
  }
  if (uassetReconstructed['Dialogues/LocTable_AllDialogues.uasset']['greenbeard_OpeningGB_D01_L01'] !== "C'était une chose très <b>dangereuse</> à faire ! À quoi pensiez-vous...") {
    throw new Error('French translation was not injected into dialogue table!');
  }
  if (uassetReconstructed['LocTable_ArenaLevel.uasset']['arena_Arena1_name'] !== 'Ferme de carottes') {
    throw new Error('French translation was not injected into arena table!');
  }

  console.log('🎉 ALL JSON SCHEMA & GROUPED DICTIONARY TESTS PASSED!');
}

testJsonSchemaCustomization().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
