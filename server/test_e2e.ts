import { GamesRepository } from './features/games/games_repository.ts';
import { TranslationsRepository } from './features/translations/translations_repository.ts';
import { GlossaryRepository } from './features/glossary/glossary_repository.ts';
import { GlossaryExtractor } from './features/gemini/glossary_extractor.ts';
import { JsonStructureParser } from './features/games/json_structure_parser.ts';

async function runVerification() {
  console.log('🧪 Starting End-to-End Verification Test...');

  // 1. Create a game
  const game = GamesRepository.create({
    name: 'Aetheria: Realm of Shadows',
    description: 'A dark fantasy tactical RPG where players wield ancient relics against the Eclipse Cult.',
    context_prompt: 'World of Aetheria. Tone is dark, majestic, and somber. Factions: Eclipse Cult, Dawn Knights. Relics like "Shadow Heart" and "Solaris Blade" are sacred proper nouns. NPC greetings should sound formal.',
    base_language: 'en-US',
  });
  console.log('✅ Game created:', game.id, game.name);

  try {

  // 2. Import sample nested JSON
  const sampleJson = {
    ui: {
      main_menu: {
        start: 'Begin Adventure',
        settings: 'Configuration',
        quit: 'Exit to Desktop',
      },
      hud: {
        health: 'HP: {current} / {max}',
        gold: '{amount} Gold Coins',
      },
    },
    quests: {
      chapter_1: {
        title: 'The Stolen Eclipse Relic',
        dialogue: {
          elder_greeting: 'Greetings, Champion {player_name}. The Eclipse Cult has infiltrated the sacred Vault of Solaris.',
          objective: 'Recover the {relic_count} Astral Shards from the Corrupted Necromancer.',
        },
      },
    },
    items: {
      solaris_blade: 'Solaris Blade',
      shadow_heart: 'Shadow Heart',
    },
  };

  const flattened = JsonStructureParser.flatten(sampleJson);
  const importedCount = GamesRepository.importBaseKeys(game.id, flattened);
  console.log(`✅ Base keys imported: ${importedCount} keys`);

  // 3. Add target language Spanish (es-ES)
  const lang = TranslationsRepository.addLanguage(game.id, 'es-ES', 'Spanish (Spain)');
  console.log('✅ Target language added:', lang.language_code);

  // 4. Add existing glossary item
  GlossaryRepository.add({
    game_id: game.id,
    source_term: 'Eclipse Cult',
    target_term: 'Culto del Eclipse',
    category: 'Lore',
    notes: 'Primary antagonist faction',
  });
  console.log('✅ Base glossary term added');

  // 5. Update some mock translations
  const baseKeys = GamesRepository.getBaseKeys(game.id);
  const startKey = baseKeys.find(k => k.key_path === 'ui.main_menu.start');
  if (startKey) {
    TranslationsRepository.updateTranslation({
      keyId: startKey.id,
      languageId: lang.id,
      translatedText: 'Comenzar Aventura',
      status: 'approved',
    });
  }

  const questKey = baseKeys.find(k => k.key_path === 'quests.chapter_1.dialogue.elder_greeting');
  if (questKey) {
    TranslationsRepository.updateTranslation({
      keyId: questKey.id,
      languageId: lang.id,
      translatedText: 'Saludos, Campeón {player_name}. El Culto del Eclipse se ha infiltrado en la Bóveda de Solaris.',
      status: 'ai_translated',
      modelUsed: 'translategemma-12b-it',
    });
  }

  const itemsKey = baseKeys.find(k => k.key_path === 'items.solaris_blade');
  if (itemsKey) {
    TranslationsRepository.updateTranslation({
      keyId: itemsKey.id,
      languageId: lang.id,
      translatedText: 'Hoja de Solaris',
      status: 'ai_translated',
      modelUsed: 'translategemma-12b-it',
    });
  }

  // 6. Test Gemini Glossary & QA Extraction
  console.log('🧠 Testing Gemini 2.0 Flash Glossary Mining & QA...');
  const existingGlossary = GlossaryRepository.getByGame(game.id, 'es-ES');
  const translations = TranslationsRepository.getTranslations(game.id, 'es-ES');
  const validPairs = translations
    .filter(t => t.translated_text && t.translated_text.trim().length > 0)
    .map(t => ({
      keyPath: t.key_path,
      sourceText: t.source_text,
      translatedText: t.translated_text,
    }));

  const analysis = await GlossaryExtractor.analyzeTranslations({
    gameName: game.name,
    gameContext: game.context_prompt,
    targetLanguageName: lang.language_name,
    targetLanguageCode: lang.language_code,
    existingGlossary,
    translationPairs: validPairs,
  });

  console.log(`✅ Gemini Analysis completed!`);
  console.log(`   Found ${analysis.candidates.length} glossary candidate terms:`);
  analysis.candidates.forEach(c => {
    console.log(`   - "${c.source_term}" -> "${c.suggested_translation}" [${c.category}] (${c.explanation})`);
  });

  console.log(`   Found ${analysis.issues.length} QA issues:`);
  analysis.issues.forEach(i => {
    console.log(`   - [${i.issue_type}] in ${i.key_path}: ${i.message}`);
  });

    // 7. Test Export JSON reconstruction
    const exportMap = TranslationsRepository.getExportMap(game.id, 'es-ES');
    const reconstructed = JsonStructureParser.unflatten(exportMap);
    console.log('✅ Export reconstructed sample:', JSON.stringify(reconstructed.ui, null, 2));

    console.log('🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } finally {
    if (game?.id) {
      console.log('🧹 Cleaning up test game:', game.id);
      GamesRepository.delete(game.id);
    }
  }
}

runVerification().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
