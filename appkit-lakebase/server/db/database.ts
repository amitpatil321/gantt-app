import type { LakebaseClient } from '../types/appkit';

/**
 * Thin typed wrapper around the AppKit Lakebase (Postgres) client.
 * Repositories depend on this class rather than on AppKit directly.
 */
export class Database {
  private readonly client: LakebaseClient;

  constructor(client: LakebaseClient) {
    this.client = client;
  }

  async many<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.client.query(sql, params);
    return result.rows as unknown as T[];
  }

  async one<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.many<T>(sql, params);
    return rows[0] ?? null;
  }
}
