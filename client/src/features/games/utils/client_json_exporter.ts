import { JsonSchemaConfig } from '../../../types/client_types.ts';

export class ClientJsonExporter {
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

      if (schema.mode === 'dictionary_kv') {
        const result: Record<string, string> = {};
        for (const [k, v] of Object.entries(flatMap)) {
          result[k] = v;
        }
        return result;
      }

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

  /**
   * Triggers a client-side file download of a localized JSON object.
   */
  static downloadJsonFile(data: any, fileName: string): void {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
