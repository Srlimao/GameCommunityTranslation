/**
 * Remote JSON DB HTTP Adapter
 * Communicates with the Generic JSON Storage DB (db.dunhas.com)
 */

export interface RemoteDbConfig {
  baseUrl: string;
  apiKey: string;
}

const getEnv = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) {
      return (import.meta as any).env[key];
    }
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key] || '';
    }
  } catch {}
  return '';
};

export const DEFAULT_REMOTE_DB_CONFIG: RemoteDbConfig = {
  baseUrl: getEnv('VITE_GCP_DB_BASE_URL') || getEnv('GCP_DB_BASE_URL') || 'https://db.dunhas.com/api',
  apiKey: getEnv('VITE_GCP_DB_API_KEY') || getEnv('GCP_API_KEY') || '',
};

const STORAGE_KEY_CONFIG = 'lt_gcp_db_config';

export class RemoteJsonDb {
  static getConfig(): RemoteDbConfig {
    // 1. Check for one-time URL hash setup (e.g. #key=YOUR_KEY or #apiKey=...)
    try {
      if (typeof window !== 'undefined' && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const hashKey = hashParams.get('key') || hashParams.get('apiKey') || hashParams.get('api_key');
        const hashBaseUrl = hashParams.get('baseUrl') || hashParams.get('base_url');

        if (hashKey) {
          const current = this.getStoredConfig();
          const updated: RemoteDbConfig = {
            baseUrl: hashBaseUrl?.trim() || current.baseUrl,
            apiKey: hashKey.trim(),
          };
          localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated));
          // Clean up the URL hash so the key is not visible in address bar or history
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          return updated;
        }
      }
    } catch {}

    return this.getStoredConfig();
  }

  private static getStoredConfig(): RemoteDbConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          baseUrl: parsed.baseUrl?.trim() || DEFAULT_REMOTE_DB_CONFIG.baseUrl,
          apiKey: parsed.apiKey?.trim() || DEFAULT_REMOTE_DB_CONFIG.apiKey,
        };
      }
    } catch {}
    return { ...DEFAULT_REMOTE_DB_CONFIG };
  }

  static setConfig(config: Partial<RemoteDbConfig>): void {
    const current = this.getConfig();
    const updated: RemoteDbConfig = {
      baseUrl: config.baseUrl?.trim() || current.baseUrl,
      apiKey: config.apiKey?.trim() || current.apiKey,
    };
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated));
  }

  private static getHeaders(): Record<string, string> {
    const config = this.getConfig();
    return {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
    };
  }

  private static getBaseUrl(): string {
    const config = this.getConfig();
    return config.baseUrl.replace(/\/+$/, '');
  }

  /**
   * Health check for db.dunhas.com
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const config = this.getConfig();
      const origin = new URL(config.baseUrl).origin;
      const res = await fetch(`${origin}/health`, { method: 'GET' });
      const data = await res.json();
      return data?.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Upsert document into a collection
   */
  static async upsertDoc<T = any>(collection: string, id: string, data: T): Promise<boolean> {
    const url = `${this.getBaseUrl()}/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Remote DB Error (${res.status}) [${collection}/${id}]: ${errText}`);
    }

    const resJson = await res.json();
    return !!resJson.ok;
  }

  /**
   * Retrieve single document by collection and ID
   */
  static async getDoc<T = any>(collection: string, id: string): Promise<T | null> {
    const url = `${this.getBaseUrl()}/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Remote DB Error (${res.status}) [${collection}/${id}]: ${errText}`);
    }

    const doc = await res.json();
    return (doc?.data as T) ?? null;
  }

  /**
   * List documents from a collection with pagination
   */
  static async listCollection<T = any>(
    collection: string,
    limit = 100,
    offset = 0
  ): Promise<{ count: number; results: Array<{ id: string; data: T; updated_at: string }> }> {
    const url = `${this.getBaseUrl()}/${encodeURIComponent(collection)}?limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Remote DB Error (${res.status}) [${collection}]: ${errText}`);
    }

    const json = await res.json();
    return {
      count: json.count || 0,
      results: (json.results || []) as Array<{ id: string; data: T; updated_at: string }>,
    };
  }

  /**
   * List all documents in a collection by paginating through offsets
   */
  static async listAllDocs<T = any>(collection: string): Promise<Array<{ id: string; data: T }>> {
    const all: Array<{ id: string; data: T }> = [];
    const limit = 100;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const res = await this.listCollection<T>(collection, limit, offset);
      all.push(...res.results.map((r) => ({ id: r.id, data: r.data })));
      offset += limit;
      if (res.results.length < limit || all.length >= res.count) {
        hasMore = false;
      }
    }

    return all;
  }

  /**
   * Delete a single document
   */
  static async deleteDoc(collection: string, id: string): Promise<boolean> {
    const url = `${this.getBaseUrl()}/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!res.ok && res.status !== 404) {
      const errText = await res.text();
      throw new Error(`Remote DB Error (${res.status}) [${collection}/${id}]: ${errText}`);
    }

    return true;
  }

  /**
   * Delete an entire collection namespace
   */
  static async deleteCollection(collection: string): Promise<boolean> {
    const url = `${this.getBaseUrl()}/${encodeURIComponent(collection)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!res.ok && res.status !== 404) {
      const errText = await res.text();
      throw new Error(`Remote DB Error (${res.status}) [${collection}]: ${errText}`);
    }

    return true;
  }
}
