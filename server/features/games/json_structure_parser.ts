import { JsonSchemaConfig } from '../../types/domain_types.ts';

export interface FlattenedKeyItem {
  keyPath: string;
  sourceText: string;
  contextNote?: string;
  orderIndex: number;
}

export class JsonStructureParser {
  /**
   * Flattens JSON based on schema configuration or default nested tree traversal.
   */
  static flattenWithConfig(jsonObj: any, schema?: JsonSchemaConfig): FlattenedKeyItem[] {
    if (!schema || schema.mode === 'nested_tree') {
      return this.flatten(jsonObj);
    }

    // Check if target is inside a root property (e.g. "Translations": [...])
    if (schema.rootPath && jsonObj && typeof jsonObj === 'object' && Array.isArray(jsonObj[schema.rootPath])) {
      return this.flattenArray(jsonObj[schema.rootPath], schema);
    }

    if (schema.mode === 'array_of_objects' && Array.isArray(jsonObj)) {
      return this.flattenArray(jsonObj, schema);
    }

    if (schema.mode === 'record_map' && typeof jsonObj === 'object' && jsonObj !== null) {
      return this.flattenRecordMap(jsonObj, schema);
    }

    if (schema.mode === 'dictionary_kv' && typeof jsonObj === 'object' && jsonObj !== null) {
      return this.flattenDictionary(jsonObj);
    }

    if (schema.mode === 'grouped_dictionary' && typeof jsonObj === 'object' && jsonObj !== null) {
      return this.flattenGroupedDictionary(jsonObj);
    }

    return this.flatten(jsonObj);
  }

  private static flattenArray(arr: any[], schema: JsonSchemaConfig): FlattenedKeyItem[] {
    const result: FlattenedKeyItem[] = [];

    arr.forEach((item, index) => {
      if (!item || typeof item !== 'object') return;

      const keyVal = schema.keyField && schema.keyField !== '_index' && item[schema.keyField] !== undefined
        ? String(item[schema.keyField])
        : `[${index}]`;

      const contextNote = schema.contextField && item[schema.contextField] !== undefined
        ? String(item[schema.contextField])
        : '';

      for (const textField of schema.textFields) {
        if (item[textField] !== undefined) {
          const keyPath = schema.textFields.length === 1 && schema.keyField && schema.keyField !== '_index'
            ? keyVal
            : `${keyVal}.${textField}`;

          result.push({
            keyPath,
            sourceText: String(item[textField]),
            contextNote,
            orderIndex: result.length,
          });
        }
      }
    });

    return result;
  }

  private static flattenDictionary(obj: Record<string, any>): FlattenedKeyItem[] {
    const result: FlattenedKeyItem[] = [];
    Object.entries(obj).forEach(([k, v]) => {
      result.push({
        keyPath: k,
        sourceText: String(v),
        contextNote: '',
        orderIndex: result.length,
      });
    });
    return result;
  }

  private static flattenGroupedDictionary(obj: Record<string, any>): FlattenedKeyItem[] {
    const result: FlattenedKeyItem[] = [];

    Object.entries(obj).forEach(([groupKey, groupVal]) => {
      if (!groupVal || typeof groupVal !== 'object' || Array.isArray(groupVal)) return;

      Object.entries(groupVal).forEach(([k, v]) => {
        result.push({
          keyPath: `${groupKey}.${k}`,
          sourceText: String(v),
          contextNote: groupKey,
          orderIndex: result.length,
        });
      });
    });

    return result;
  }

  private static flattenRecordMap(obj: Record<string, any>, schema: JsonSchemaConfig): FlattenedKeyItem[] {
    const result: FlattenedKeyItem[] = [];

    Object.entries(obj).forEach(([recordKey, item]) => {
      if (!item || typeof item !== 'object') return;

      const contextNote = schema.contextField && item[schema.contextField] !== undefined
        ? String(item[schema.contextField])
        : '';

      for (const textField of schema.textFields) {
        if (item[textField] !== undefined) {
          const keyPath = `${recordKey}.${textField}`;
          result.push({
            keyPath,
            sourceText: String(item[textField]),
            contextNote,
            orderIndex: result.length,
          });
        }
      }
    });

    return result;
  }

  /**
   * Flattens standard nested JSON object or array.
   */
  static flatten(jsonObj: any, prefix = '', result: FlattenedKeyItem[] = []): FlattenedKeyItem[] {
    if (jsonObj === null || jsonObj === undefined) return result;

    if (typeof jsonObj === 'string') {
      result.push({
        keyPath: prefix,
        sourceText: jsonObj,
        orderIndex: result.length,
      });
    } else if (Array.isArray(jsonObj)) {
      jsonObj.forEach((item, index) => {
        const itemKey = prefix ? `${prefix}[${index}]` : `[${index}]`;
        this.flatten(item, itemKey, result);
      });
    } else if (typeof jsonObj === 'object') {
      Object.keys(jsonObj).forEach(key => {
        const nestedKey = prefix ? `${prefix}.${key}` : key;
        this.flatten(jsonObj[key], nestedKey, result);
      });
    } else if (typeof jsonObj === 'number' || typeof jsonObj === 'boolean') {
      result.push({
        keyPath: prefix,
        sourceText: String(jsonObj),
        orderIndex: result.length,
      });
    }

    return result;
  }

  /**
   * Reconstructs the target JSON. If a raw JSON template & schema exists, injects translations
   * directly while preserving all ignored metadata attributes.
   */
  static unflattenWithTemplate(
    flatMap: Record<string, string>,
    rawTemplateStr?: string,
    schemaConfigStr?: string
  ): any {
    if (!rawTemplateStr || !schemaConfigStr) {
      return this.unflatten(flatMap);
    }

    try {
      const template = JSON.parse(rawTemplateStr);
      const schema: JsonSchemaConfig = JSON.parse(schemaConfigStr);

      // 1. Array inside a property (e.g. "Translations": [ ... ])
      if (schema.rootPath && template && typeof template === 'object' && Array.isArray(template[schema.rootPath])) {
        const cloned = JSON.parse(JSON.stringify(template));
        const arr = cloned[schema.rootPath];

        arr.forEach((item: any, index: number) => {
          if (!item || typeof item !== 'object') return;

          const keyVal = schema.keyField && schema.keyField !== '_index' && item[schema.keyField] !== undefined
            ? String(item[schema.keyField])
            : `[${index}]`;

          for (const textField of schema.textFields) {
            const keyPath = schema.textFields.length === 1 && schema.keyField && schema.keyField !== '_index'
              ? keyVal
              : `${keyVal}.${textField}`;

            if (flatMap[keyPath] !== undefined) {
              item[textField] = flatMap[keyPath];
            }
          }
        });

        return cloned;
      }

      // 2. Root Array of objects
      if (schema.mode === 'array_of_objects' && Array.isArray(template)) {
        const cloned = JSON.parse(JSON.stringify(template));
        cloned.forEach((item: any, index: number) => {
          if (!item || typeof item !== 'object') return;

          const keyVal = schema.keyField && schema.keyField !== '_index' && item[schema.keyField] !== undefined
            ? String(item[schema.keyField])
            : `[${index}]`;

          for (const textField of schema.textFields) {
            const keyPath = schema.textFields.length === 1 && schema.keyField && schema.keyField !== '_index'
              ? keyVal
              : `${keyVal}.${textField}`;

            if (flatMap[keyPath] !== undefined) {
              item[textField] = flatMap[keyPath];
            }
          }
        });
        return cloned;
      }

      // 3. Simple Dictionary
      if (schema.mode === 'dictionary_kv') {
        const result: Record<string, string> = {};
        for (const [k, v] of Object.entries(flatMap)) {
          result[k] = v;
        }
        return result;
      }

      // 4. Record Map
      if (schema.mode === 'record_map' && typeof template === 'object' && template !== null) {
        const cloned = JSON.parse(JSON.stringify(template));
        Object.entries(cloned).forEach(([recordKey, item]: [string, any]) => {
          if (!item || typeof item !== 'object') return;

          for (const textField of schema.textFields) {
            const keyPath = `${recordKey}.${textField}`;
            if (flatMap[keyPath] !== undefined) {
              item[textField] = flatMap[keyPath];
            }
          }
        });
        return cloned;
      }

      // 5. Grouped Multi-Table Dictionary (e.g. Unreal LocTable / StringTable exports)
      if (schema.mode === 'grouped_dictionary' && typeof template === 'object' && template !== null) {
        const cloned = JSON.parse(JSON.stringify(template));
        Object.entries(cloned).forEach(([groupKey, groupObj]: [string, any]) => {
          if (!groupObj || typeof groupObj !== 'object' || Array.isArray(groupObj)) return;

          Object.keys(groupObj).forEach((k) => {
            const keyPath = `${groupKey}.${k}`;
            if (flatMap[keyPath] !== undefined) {
              groupObj[k] = flatMap[keyPath];
            }
          });
        });
        return cloned;
      }

      return this.unflatten(flatMap);
    } catch {
      return this.unflatten(flatMap);
    }
  }

  static unflatten(flatMap: Record<string, string>): any {
    const root: any = {};
    for (const [keyPath, value] of Object.entries(flatMap)) {
      this.setPathValue(root, keyPath, value);
    }
    return root;
  }

  private static setPathValue(target: any, pathStr: string, value: string): void {
    const segments: string[] = [];
    const regex = /([^.\[\]]+)|\[(\d+)\]/g;
    let match;

    while ((match = regex.exec(pathStr)) !== null) {
      if (match[1] !== undefined) {
        segments.push(match[1]);
      } else if (match[2] !== undefined) {
        segments.push(match[2]);
      }
    }

    if (segments.length === 0) return;

    let current = target;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      const nextSeg = segments[i + 1];
      const isNextArray = /^\d+$/.test(nextSeg);

      if (!(seg in current)) {
        current[seg] = isNextArray ? [] : {};
      }
      current = current[seg];
    }

    const lastSeg = segments[segments.length - 1];
    current[lastSeg] = value;
  }
}
