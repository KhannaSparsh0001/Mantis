import type { QueryResultDocumentInfo, SearchResult } from '@moss-dev/moss';

export type { QueryResultDocumentInfo, SearchResult };

export interface ManualChunkMeta {
  productId: string;
  page: number;
  chunkIndex: number;
  manualTitle?: string;
  uploadedAt?: string;
}

export interface MossDoc {
  id: string;
  text: string;
  metadata?: Record<string, string>;
  score?: number;
}

export interface MossQueryResult {
  docs: MossDoc[];
  query: string;
  indexName?: string;
  timeTakenInMs?: number;
}

export type MossErrorType = 'indexNotFound' | 'unauthorized' | 'notLoaded' | 'generic';

export interface MossError {
  type: MossErrorType;
  message: string;
  cause?: unknown;
}
