import { JsonAnalysisResult, JsonSchemaConfig, DetectedListPath } from '../../types/domain_types.ts';
import { JsonStructureParser } from './json_structure_parser.ts';

export class JsonSchemaDetector {
  static analyze(rawJson: any, preferredPath?: string): JsonAnalysisResult {
    if (Array.isArray(rawJson)) {
      return this.analyzeArrayOfObjects(rawJson, '', [{ path: '(Root Array)', count: rawJson.length, sampleFields: [] }]);
    }

    if (rawJson && typeof rawJson === 'object') {
      return this.analyzeObject(rawJson, preferredPath);
    }

    throw new Error('Input must be a valid JSON object or array of objects.');
  }

  private static analyzeObject(obj: any, preferredPath?: string): JsonAnalysisResult {
    // 1. Scan top-level properties for arrays of objects (like "Translations": [...])
    const detectedListPaths: DetectedListPath[] = [];

    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value) && value.length > 0) {
        const sample = value.slice(0, 10);
        const sampleFields = new Set<string>();
        for (const item of sample) {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            Object.keys(item).forEach(k => sampleFields.add(k));
          }
        }
        if (sampleFields.size > 0) {
          detectedListPaths.push({
            path: key,
            count: value.length,
            sampleFields: Array.from(sampleFields),
          });
        }
      }
    }

    // If an array property exists or preferredPath is specified
    if (detectedListPaths.length > 0) {
      let targetPath = preferredPath;
      if (!targetPath || !obj[targetPath]) {
        // Prioritize common names or largest array
        const priorityNames = ['translations', 'entries', 'data', 'items', 'strings', 'stringtable', 'list', 'rows', 'dialogues'];
        const matched = detectedListPaths.find(p => priorityNames.includes(p.path.toLowerCase()));
        targetPath = matched ? matched.path : detectedListPaths[0].path;
      }

      const targetArray = obj[targetPath];
      if (Array.isArray(targetArray)) {
        return this.analyzeArrayOfObjects(targetArray, targetPath, detectedListPaths);
      }
    }

    // 2. Check if it's a dictionary of simple strings: { "start": "Start Game", "quit": "Exit" }
    const entries = Object.entries(obj);
    const areAllStringValues = entries.length > 0 && entries.every(([_, v]) => typeof v === 'string');

    if (areAllStringValues) {
      const samplePreview = entries.slice(0, 8).map(([k, v]) => ({
        keyPath: k,
        sourceText: String(v),
        contextNote: '',
        ignoredAttributes: {},
      }));

      return {
        structureType: 'dictionary_kv',
        totalItemsCount: entries.length,
        detectedListPaths: [],
        availableFields: ['_key', '_value'],
        suggestedKeyField: '_key',
        suggestedTextFields: ['_value'],
        samplePreview,
      };
    }

    // 3. Check if it's a map of records: { "quest_1": { "text": "...", "speaker": "..." } }
    const areAllObjectValues = entries.length > 0 && entries.every(([_, v]) => v && typeof v === 'object' && !Array.isArray(v));
    if (areAllObjectValues) {
      const sampleArray = entries.slice(0, 50).map(([k, v]) => ({ _key: k, ...(v as object) }));
      const arrayAnalysis = this.analyzeArrayOfObjects(sampleArray, '', []);
      return {
        ...arrayAnalysis,
        structureType: 'record_map',
        totalItemsCount: entries.length,
        suggestedKeyField: '_key',
      };
    }

    // 4. Default fallback: Nested Tree
    const flattened = JsonStructureParser.flatten(obj);
    const samplePreview = flattened.slice(0, 8).map(item => ({
      keyPath: item.keyPath,
      sourceText: item.sourceText,
      contextNote: '',
      ignoredAttributes: {},
    }));

    return {
      structureType: 'nested_tree',
      totalItemsCount: flattened.length,
      detectedListPaths,
      availableFields: ['(nested tree keys)'],
      suggestedTextFields: ['(auto-flatten all string leaves)'],
      samplePreview,
    };
  }

  private static analyzeArrayOfObjects(
    arr: any[],
    rootPath: string,
    detectedListPaths: DetectedListPath[]
  ): JsonAnalysisResult {
    // Fast sampling of the first 50 items to keep detection instantaneous even on 500k+ item datasets
    const sample = arr.slice(0, 50);
    const fieldFrequency = new Map<string, number>();
    const fieldTypes = new Map<string, Set<string>>();

    for (const item of sample) {
      if (item && typeof item === 'object') {
        for (const [k, v] of Object.entries(item)) {
          fieldFrequency.set(k, (fieldFrequency.get(k) || 0) + 1);
          if (!fieldTypes.has(k)) fieldTypes.set(k, new Set());
          fieldTypes.get(k)!.add(typeof v);
        }
      }
    }

    const availableFields = Array.from(fieldFrequency.keys());

    // Key field candidates heuristics (e.g. "Key", "id", "code", "name")
    const keyCandidates = ['key', 'id', 'code', 'identifier', 'name', 'tag', 'guid', 'stringid', 'msgid'];
    let suggestedKeyField = availableFields.find(f => keyCandidates.includes(f.toLowerCase())) || '_index';

    // Text field candidates heuristics (e.g. "Value", "text", "source", "message")
    const textCandidates = ['value', 'text', 'source', 'string', 'message', 'content', 'description', 'dialogue', 'translation', 'title', 'name', 'body', 'label'];
    const stringFields = availableFields.filter(f => {
      const types = fieldTypes.get(f);
      return types?.has('string');
    });

    let suggestedTextFields = stringFields.filter(f => {
      const lower = f.toLowerCase();
      return textCandidates.includes(lower) && f !== suggestedKeyField;
    });

    if (suggestedTextFields.length === 0) {
      const fallbackString = stringFields.find(f => f !== suggestedKeyField);
      if (fallbackString) suggestedTextFields.push(fallbackString);
      else if (availableFields.length > 1) suggestedTextFields.push(availableFields[1]);
    }

    // Context field candidates heuristics (e.g. "Comment", "speaker", "note")
    const contextCandidates = ['comment', 'speaker', 'character', 'note', 'context', 'type', 'category', 'location', 'version'];
    const suggestedContextField = availableFields.find(f => {
      const lower = f.toLowerCase();
      return contextCandidates.includes(lower) && f !== suggestedKeyField && !suggestedTextFields.includes(f);
    });

    const samplePreview = this.generateArraySamplePreview(sample.slice(0, 8), {
      mode: 'array_of_objects',
      rootPath: rootPath || undefined,
      keyField: suggestedKeyField,
      textFields: suggestedTextFields.length > 0 ? suggestedTextFields : (stringFields.slice(0, 1)),
      contextField: suggestedContextField,
    });

    return {
      structureType: 'array_of_objects',
      totalItemsCount: arr.length,
      detectedListPaths,
      selectedListPath: rootPath || undefined,
      availableFields,
      suggestedKeyField,
      suggestedTextFields: suggestedTextFields.length > 0 ? suggestedTextFields : stringFields.slice(0, 1),
      suggestedContextField,
      samplePreview,
    };
  }

  static generateArraySamplePreview(
    sampleItems: any[],
    schema: JsonSchemaConfig
  ): JsonAnalysisResult['samplePreview'] {
    const preview: JsonAnalysisResult['samplePreview'] = [];

    sampleItems.forEach((item, index) => {
      if (!item || typeof item !== 'object') return;

      const idVal = schema.keyField && schema.keyField !== '_index' && item[schema.keyField] !== undefined
        ? String(item[schema.keyField])
        : `[${index}]`;

      const contextNote = schema.contextField && item[schema.contextField] !== undefined
        ? String(item[schema.contextField])
        : undefined;

      // Extract ignored attributes
      const ignored: Record<string, any> = {};
      for (const [k, v] of Object.entries(item)) {
        if (k !== schema.keyField && !schema.textFields.includes(k) && k !== schema.contextField) {
          ignored[k] = v;
        }
      }

      for (const textField of schema.textFields) {
        if (item[textField] !== undefined) {
          const keyPath = schema.textFields.length === 1 && schema.keyField && schema.keyField !== '_index'
            ? idVal
            : `${idVal}.${textField}`;

          preview.push({
            keyPath,
            sourceText: String(item[textField]),
            contextNote,
            ignoredAttributes: ignored,
          });
        }
      }
    });

    return preview;
  }
}
