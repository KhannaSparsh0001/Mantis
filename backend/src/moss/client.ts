import { MossClient, type SessionIndex } from '@moss-dev/moss';
import type { SearchResult, QueryResultDocumentInfo } from '@moss-dev/moss';
import { ENV } from '../config/env.ts';
import { mkdir } from 'node:fs/promises';
import type { MossError, MossErrorType } from './types.ts';

const MANUALS_INDEX = 'manuals';
const CACHE_DIR = './.moss-cache';

let _client: MossClient | null = null;
let _manualsReadyPromise: Promise<void> | null = null;

function mapMossError(error: unknown): MossError {
  const message = error instanceof Error ? error.message : String(error);

  if (/unauthorized/i.test(message)) {
    return { type: 'unauthorized' as MossErrorType, message, cause: error };
  }
  if (/not found/i.test(message) || /index.*not exist/i.test(message) || /does not exist/i.test(message)) {
    return { type: 'indexNotFound' as MossErrorType, message, cause: error };
  }
  if (/not loaded/i.test(message)) {
    return { type: 'notLoaded' as MossErrorType, message, cause: error };
  }
  return { type: 'generic' as MossErrorType, message, cause: error };
}

function wrapMossCall<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch(err => {
    throw mapMossError(err);
  });
}

export const moss = new Proxy({} as MossClient, {
  get(_target, prop: string | symbol) {
    if (!_client) {
      return (...args: unknown[]) => {
        throw new Error(`MOSS client not initialized. Call initMoss() before using moss.${String(prop)}().`);
      };
    }
    const val = (_client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof val === 'function') {
      return (...args: unknown[]) => (val as Function).apply(_client, args);
    }
    return val;
  },
});

async function ensureManualsIndexReady(): Promise<void> {
  if (_manualsReadyPromise) return _manualsReadyPromise;

  _manualsReadyPromise = (async () => {
    if (!_client) {
      _client = new MossClient(ENV.MOSS_PROJECT_ID, ENV.MOSS_PROJECT_KEY);
    }

    try {
      await mkdir(CACHE_DIR, { recursive: true });
    } catch {
      console.warn('[moss] Failed to create cache directory, falling back to memory-only mode');
    }

    try {
      const indexes = await _client.listIndexes();
      const exists = indexes.some(idx => idx.name === MANUALS_INDEX);
      if (!exists) {
        await _client.createIndex(MANUALS_INDEX, [
          { id: '_init', text: '', metadata: { productId: '_init' } },
        ]);
        console.log(`[moss] Created shared index "${MANUALS_INDEX}"`);
      }
    } catch (err) {
      const mapped = mapMossError(err);
      if (mapped.type === 'unauthorized') {
        throw mapped;
      }
      console.warn(`[moss] Index check/create warning: ${mapped.message}`);
    }

    try {
      await _client.loadIndex(MANUALS_INDEX, {
        cachePath: CACHE_DIR,
        autoRefresh: true,
        pollingIntervalInSeconds: 120,
      });
    } catch (err) {
      throw mapMossError(err);
    }
  })();

  return _manualsReadyPromise;
}

export async function initMoss(mockClient?: MossClient): Promise<MossClient> {
  if (mockClient) {
    _client = mockClient;
    _manualsReadyPromise = null;
  }
  if (_client && !mockClient) return _client;

  await ensureManualsIndexReady();
  return _client!;
}

type SessionEntry = {
  session: SessionIndex;
  loadedIndexes: Set<string>;
};

const sessions = new Map<string, SessionEntry>();

export async function getOrCreateSession(sessionId?: string): Promise<{
  session: SessionIndex;
  sessionId: string;
  isNew: boolean;
}> {
  if (sessionId && sessions.has(sessionId)) {
    const entry = sessions.get(sessionId)!;
    return { session: entry.session, sessionId, isNew: false };
  }

  const newId = sessionId || `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const session = await moss.session(newId);
  sessions.set(newId, { session, loadedIndexes: new Set() });
  return { session, sessionId: newId, isNew: true };
}

export async function ensureIndexLoaded(sessionId: string, indexName: string): Promise<boolean> {
  const entry = sessions.get(sessionId);
  if (!entry) return false;
  if (entry.loadedIndexes.has(indexName)) return true;
  try {
    await entry.session.loadIndex(indexName);
    entry.loadedIndexes.add(indexName);
    return true;
  } catch {
    return false;
  }
}

export function getSession(sessionId: string): SessionEntry | undefined {
  return sessions.get(sessionId);
}

export function cleanupSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export async function queryProductIndexes(
  productIds: string[],
  query: string,
  topK: number = 3,
  filterOverride?: unknown,
): Promise<{ context: string; sources: string[] }> {
  if (!productIds || productIds.length === 0) {
    return { context: '', sources: [] };
  }

  await ensureManualsIndexReady();

  const filter = filterOverride ?? {
    field: 'productId',
    condition: { $in: productIds },
  };

  try {
    const results = await wrapMossCall(() =>
      _client!.query(MANUALS_INDEX, query, {
        topK,
        alpha: 0.5,
        filter,
      })
    );

    const searchResult = results as SearchResult;
    const docs = searchResult.docs ?? [];
    const context = docs.map((d: QueryResultDocumentInfo) => d.text).join('\n');
    const sources = [...new Set(
      docs.map((d: QueryResultDocumentInfo) => d.metadata?.productId).filter(Boolean),
    )] as string[];

    return { context, sources };
  } catch {
    return { context: '', sources: [] };
  }
}
