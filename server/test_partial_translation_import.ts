import { ClientJsonParser } from '../client/src/features/games/utils/client_json_parser.ts';
import { JsonSchemaConfig } from '../client/src/types/client_types.ts';

async function runTests() {
  console.log('🧪 Testing Partial Translation JSON Extraction & Matching...');

  // 1. Nested Tree JSON
  console.log('\n--- 1. Testing Nested Tree Partial JSON ---');
  const baseNested = {
    menu: {
      start_game: 'Start Adventure',
      options: 'Options & Settings',
      dialogue: {
        intro: 'Hello traveler!',
        farewell: 'Goodbye traveler!'
      }
    }
  };
  const partialNested = {
    menu: {
      start_game: 'Iniciar Aventura',
      dialogue: {
        intro: '¡Hola viajero!'
      }
    }
  };

  const baseItems = ClientJsonParser.flattenWithConfig(baseNested);
  const partialItems = ClientJsonParser.flattenWithConfig(partialNested);

  console.log('Base keys:', baseItems.map(b => b.keyPath));
  console.log('Partial keys:', partialItems.map(p => p.keyPath + ' -> ' + p.sourceText));

  const baseKeyMap = new Map(baseItems.map(b => [b.keyPath, b]));
  const matchedNested = partialItems.filter(p => baseKeyMap.has(p.keyPath));

  if (matchedNested.length !== 2) {
    throw new Error(`Expected 2 matched keys in nested partial JSON, got ${matchedNested.length}`);
  }
  if (matchedNested.find(m => m.keyPath === 'menu.start_game')?.sourceText !== 'Iniciar Aventura') {
    throw new Error('Mismatched text for menu.start_game');
  }

  // 2. Array of Objects JSON
  console.log('\n--- 2. Testing Array of Objects Partial JSON ---');
  const schemaArray: JsonSchemaConfig = {
    mode: 'array_of_objects',
    keyField: 'id',
    textFields: ['text'],
    contextField: 'speaker'
  };

  const baseArray = [
    { id: 'quest_1', speaker: 'King', text: 'Save the kingdom!' },
    { id: 'quest_2', speaker: 'Guard', text: 'Stop right there!' },
    { id: 'quest_3', speaker: 'Wizard', text: 'Cast your spell.' }
  ];

  // Partial translated array with only quest_1 and quest_3 translated
  const partialArray = [
    { id: 'quest_1', text: '¡Salva el reino!' },
    { id: 'quest_3', text: 'Lanza tu hechizo.' }
  ];

  const baseArrayItems = ClientJsonParser.flattenWithConfig(baseArray, schemaArray);
  const partialArrayItems = ClientJsonParser.flattenWithConfig(partialArray, schemaArray);

  console.log('Base array keys:', baseArrayItems.map(b => b.keyPath));
  console.log('Partial array keys:', partialArrayItems.map(p => p.keyPath + ' -> ' + p.sourceText));

  const baseArrayMap = new Map(baseArrayItems.map(b => [b.keyPath, b]));
  const matchedArray = partialArrayItems.filter(p => baseArrayMap.has(p.keyPath));

  if (matchedArray.length !== 2) {
    throw new Error(`Expected 2 matched keys in array partial JSON, got ${matchedArray.length}`);
  }
  if (matchedArray.find(m => m.keyPath === 'quest_1')?.sourceText !== '¡Salva el reino!') {
    throw new Error('Mismatched text for quest_1');
  }

  // 3. Grouped Dictionary (.uasset format)
  console.log('\n--- 3. Testing Grouped Dictionary Partial JSON ---');
  const schemaGrouped: JsonSchemaConfig = {
    mode: 'grouped_dictionary',
    textFields: ['_value']
  };

  const baseGrouped = {
    'Dialogues/LocTable.uasset': {
      'd_01': 'Welcome to town',
      'd_02': 'Buy some potions'
    },
    'UI/LocTable.uasset': {
      'btn_ok': 'OK',
      'btn_cancel': 'Cancel'
    }
  };

  const partialGrouped = {
    'Dialogues/LocTable.uasset': {
      'd_01': 'Bienvenue en ville'
    },
    'UI/LocTable.uasset': {
      'btn_ok': "D'accord"
    }
  };

  const baseGroupedItems = ClientJsonParser.flattenWithConfig(baseGrouped, schemaGrouped);
  const partialGroupedItems = ClientJsonParser.flattenWithConfig(partialGrouped, schemaGrouped);

  console.log('Base grouped keys:', baseGroupedItems.map(b => b.keyPath));
  console.log('Partial grouped keys:', partialGroupedItems.map(p => p.keyPath + ' -> ' + p.sourceText));

  const baseGroupedMap = new Map(baseGroupedItems.map(b => [b.keyPath, b]));
  const matchedGrouped = partialGroupedItems.filter(p => baseGroupedMap.has(p.keyPath));

  if (matchedGrouped.length !== 2) {
    throw new Error(`Expected 2 matched keys in grouped partial JSON, got ${matchedGrouped.length}`);
  }

  console.log('\n🎉 ALL PARTIAL TRANSLATION EXTRACTION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
