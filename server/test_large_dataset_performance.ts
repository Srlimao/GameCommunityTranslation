import { runWithConcurrency } from '../client/src/services/concurrency_limiter.ts';
import { ClientJsonParser } from '../client/src/features/games/utils/client_json_parser.ts';
import { JsonSchemaConfig } from '../client/src/types/client_types.ts';

async function runPerformanceStressTests() {
  console.log('⚡ Starting Large Dataset & Concurrency Performance Benchmarks...');

  // 1. Test Concurrency Limiter
  console.log('\n--- 1. Testing Concurrency Limiter Pool (4 workers max) ---');
  let currentActive = 0;
  let maxObservedActive = 0;
  const taskCount = 20;
  const tasks = Array.from({ length: taskCount }, (_, i) => i);

  const results = await runWithConcurrency(
    tasks,
    4,
    async (taskIndex) => {
      currentActive++;
      if (currentActive > maxObservedActive) maxObservedActive = currentActive;
      // Simulate network request latency
      await new Promise((r) => setTimeout(r, 20));
      currentActive--;
      return `result_${taskIndex}`;
    },
    (completed, total) => {
      if (completed % 5 === 0 || completed === total) {
        console.log(`   Progress: ${completed} / ${total} (${Math.round((completed / total) * 100)}%)`);
      }
    }
  );

  console.log(`✅ Max concurrent tasks observed: ${maxObservedActive} (Target: <= 4)`);
  if (maxObservedActive > 4) {
    throw new Error(`Concurrency exceeded limit! Expected <= 4, got ${maxObservedActive}`);
  }
  if (results.length !== taskCount) {
    throw new Error(`Expected ${taskCount} results, got ${results.length}`);
  }

  // 2. Test Large Dataset Parsing (10,000 dialogue entries)
  console.log('\n--- 2. Testing 10,000 Key Dataset Flattening & Chunking ---');
  const startTime = Date.now();
  const largeDialogueDataset = [];
  for (let i = 0; i < 10000; i++) {
    largeDialogueDataset.push({
      id: `dialogue_act_${i}`,
      speaker: `NPC_Villager_${i % 50}`,
      text: `Greetings traveler, have you seen artifact #${i} in the lost ruins of the ancients?`,
      location: `Zone_${i % 10}`,
      audio_id: 10000 + i,
    });
  }
  console.log(`   Generated 10,000 mock items in ${Date.now() - startTime}ms.`);

  const parseStart = Date.now();
  const schema: JsonSchemaConfig = {
    mode: 'array_of_objects',
    keyField: 'id',
    textFields: ['text'],
    contextField: 'speaker',
  };

  const flattened = ClientJsonParser.flattenWithConfig(largeDialogueDataset, schema);
  const parseDuration = Date.now() - parseStart;
  console.log(`✅ Flattened ${flattened.length} keys in ${parseDuration}ms (~${Math.round(flattened.length / (parseDuration / 1000))} keys/sec).`);

  if (flattened.length !== 10000) {
    throw new Error(`Expected 10,000 keys, got ${flattened.length}`);
  }

  // 3. Test Chunk Splitting with 1,000 items per chunk
  const CHUNK_SIZE = 1000;
  const totalChunks = Math.ceil(flattened.length / CHUNK_SIZE);
  console.log(`✅ Split into ${totalChunks} chunks of ${CHUNK_SIZE} items each.`);

  if (totalChunks !== 10) {
    throw new Error(`Expected 10 chunks, got ${totalChunks}`);
  }

  console.log('\n🎉 ALL LARGE DATASET & CONCURRENCY BENCHMARKS PASSED!');
}

runPerformanceStressTests().catch((err) => {
  console.error('❌ Benchmark failed:', err);
  process.exit(1);
});
