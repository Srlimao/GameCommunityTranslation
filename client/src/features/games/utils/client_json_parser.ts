import { JsonSchemaConfig } from '../../../types/client_types.ts';

export interface FlattenedKeyItem {
  keyPath: string;
  sourceText: string;
  contextNote?: string;
  orderIndex: number;
}

export class ClientJsonParser {
  /**
   * Flattens JSON based on schema configuration or default nested tree traversal.
   */
  static flattenWithConfig(jsonObj: any, schema?: JsonSchemaConfig): FlattenedKeyItem[] {
    if (!schema || schema.mode === 'nested_tree') {
      return this.flatten(jsonObj);
    }

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
      Object.keys(jsonObj).forEach((key) => {
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
}
