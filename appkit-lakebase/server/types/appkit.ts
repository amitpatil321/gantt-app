import type { Application } from 'express';

/**
 * Minimal structural typing for the AppKit instance handed to `onPluginsReady`.
 * Only the capabilities this app relies on are declared here.
 */
export interface LakebaseClient {
  query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

export interface AppKitInstance {
  lakebase: LakebaseClient;
  server: {
    extend(fn: (app: Application) => void): void;
  };
}
