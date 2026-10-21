/**
 * Persistent Browser Media Store using IndexedDB.
 * Offloads heavy base64 image strings from localStorage to prevent QuotaExceededError
 * while preserving full persistence across browser refreshes and sessions.
 * Associates each media asset with Project ID, Asset or Shot ID, Image Role,
 * Approval Status, and Revision identifier.
 */

const DB_NAME = 'xemacs7_film_studio_media_db';
const DB_VERSION = 2;
const STORE_NAME = 'media_assets';

export type ImageRole =
  | 'MASTER'
  | 'FRONT'
  | 'BACK'
  | 'SIDE'
  | 'TOP'
  | 'EXPRESSION'
  | 'FIRST_FRAME'
  | 'END_FRAME'
  | 'PREVIEW'
  | 'REFERENCE';

export interface StoredMediaRecord {
  mediaId: string;
  dataUrl: string;
  projectId?: string;
  targetId?: string; // Asset ID (CHAR-001) or Shot ID (SHOT-01)
  imageRole?: ImageRole;
  approvalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';
  revisionId?: string;
  mimeType?: string;
  filename?: string;
  source?: 'UPLOAD' | 'GEMINI_GEN' | 'EXTERNAL_REF';
  updatedAt: string;
}

export interface MediaSaveResult {
  success: boolean;
  isPersistent: boolean;
  mediaId: string;
  warning?: string;
}

// In-memory fallback cache in case IndexedDB is restricted in private browsing
const memoryCache = new Map<string, StoredMediaRecord>();

let dbPromise: Promise<IDBDatabase | null> | null = null;
let lastDbError: string | null = null;

function getDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    lastDbError = 'IndexedDB not available in current environment';
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event: any) => {
          const db = event.target.result as IDBDatabase;
          let store: IDBObjectStore;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            store = db.createObjectStore(STORE_NAME, { keyPath: 'mediaId' });
          } else {
            store = event.target.transaction.objectStore(STORE_NAME);
          }
          // Indexes for fast lookup by project, target asset, or approval status
          if (!store.indexNames.contains('projectId')) {
            store.createIndex('projectId', 'projectId', { unique: false });
          }
          if (!store.indexNames.contains('targetId')) {
            store.createIndex('targetId', 'targetId', { unique: false });
          }
        };
        request.onsuccess = (event: any) => {
          resolve(event.target.result as IDBDatabase);
        };
        request.onerror = (err: any) => {
          lastDbError = err?.target?.error?.message || 'IndexedDB failed to open';
          console.warn('[MediaStore] IndexedDB open failed, falling back to in-memory store:', lastDbError);
          resolve(null);
        };
      } catch (e: any) {
        lastDbError = e?.message || 'IndexedDB access exception';
        console.warn('[MediaStore] IndexedDB access exception:', e);
        resolve(null);
      }
    });
  }
  return dbPromise;
}

/**
 * Validates persistent storage health and capacity
 */
export async function checkPersistenceHealth(): Promise<{
  isPersistent: boolean;
  backend: 'IndexedDB' | 'MemoryCache';
  error?: string;
}> {
  const db = await getDb();
  if (!db) {
    return {
      isPersistent: false,
      backend: 'MemoryCache',
      error: lastDbError || 'IndexedDB is restricted or disabled. Images will only persist during current session.',
    };
  }
  return {
    isPersistent: true,
    backend: 'IndexedDB',
  };
}

export async function saveMediaItem(
  mediaId: string,
  dataUrl: string,
  meta?: {
    projectId?: string;
    targetId?: string;
    imageRole?: ImageRole;
    approvalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';
    revisionId?: string;
    source?: 'UPLOAD' | 'GEMINI_GEN' | 'EXTERNAL_REF';
    mimeType?: string;
    filename?: string;
  }
): Promise<boolean> {
  const result = await saveMediaItemDetailed(mediaId, dataUrl, meta);
  return Boolean(result.success && result.isPersistent);
}

export async function saveMediaItemDetailed(
  mediaId: string,
  dataUrl: string,
  meta?: {
    projectId?: string;
    targetId?: string;
    imageRole?: ImageRole;
    approvalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';
    revisionId?: string;
    source?: 'UPLOAD' | 'GEMINI_GEN' | 'EXTERNAL_REF';
    mimeType?: string;
    filename?: string;
  }
): Promise<MediaSaveResult> {
  if (!mediaId || !dataUrl) {
    return { success: false, isPersistent: false, mediaId, warning: 'Invalid media ID or image data' };
  }

  const record: StoredMediaRecord = {
    mediaId,
    dataUrl,
    projectId: meta?.projectId,
    targetId: meta?.targetId,
    imageRole: meta?.imageRole || 'REFERENCE',
    approvalStatus: meta?.approvalStatus || 'APPROVED',
    revisionId: meta?.revisionId || `rev-${Date.now()}`,
    mimeType: meta?.mimeType || 'image/png',
    filename: meta?.filename,
    source: meta?.source || 'UPLOAD',
    updatedAt: new Date().toISOString(),
  };

  // Cache in memory for quick retrieval
  memoryCache.set(mediaId, record);

  const db = await getDb();
  if (!db) {
    // True persistence rule: DO NOT return durable success for in-memory fallback
    return {
      success: false,
      isPersistent: false,
      mediaId,
      warning: 'IndexedDB is unavailable. Media saved in temporary memory only.',
    };
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      let requestSuccess = false;

      req.onsuccess = () => {
        requestSuccess = true;
      };

      req.onerror = () => {
        const errorMsg = req.error?.message || 'Database write error';
        console.warn('[MediaStore] Could not put item in IndexedDB:', errorMsg);
      };

      tx.oncomplete = () => {
        if (requestSuccess) {
          resolve({ success: true, isPersistent: true, mediaId });
        } else {
          resolve({
            success: false,
            isPersistent: false,
            mediaId,
            warning: 'Transaction completed without put confirmation',
          });
        }
      };

      tx.onerror = () => {
        const errorMsg = tx.error?.message || 'Transaction error';
        console.warn('[MediaStore] Transaction error:', errorMsg);
        resolve({
          success: false,
          isPersistent: false,
          mediaId,
          warning: `Failed to persist media: ${errorMsg}`,
        });
      };

      tx.onabort = () => {
        const errorMsg = tx.error?.message || 'Transaction aborted';
        console.warn('[MediaStore] Transaction aborted:', errorMsg);
        resolve({
          success: false,
          isPersistent: false,
          mediaId,
          warning: `Media transaction aborted: ${errorMsg}`,
        });
      };
    } catch (err: any) {
      console.warn('[MediaStore] Transaction error:', err);
      resolve({
        success: false,
        isPersistent: false,
        mediaId,
        warning: `Saved in memory only: ${err?.message || 'Transaction error'}`,
      });
    }
  });
}

export async function getMediaItem(mediaId: string): Promise<string | null> {
  if (!mediaId) return null;
  if (memoryCache.has(mediaId)) {
    return memoryCache.get(mediaId)?.dataUrl || null;
  }

  const db = await getDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(mediaId);
      req.onsuccess = () => {
        const result = req.result as StoredMediaRecord | undefined;
        if (result && result.dataUrl) {
          memoryCache.set(mediaId, result);
          resolve(result.dataUrl);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function getMediaRecord(mediaId: string): Promise<StoredMediaRecord | null> {
  if (!mediaId) return null;
  if (memoryCache.has(mediaId)) {
    return memoryCache.get(mediaId) || null;
  }

  const db = await getDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(mediaId);
      req.onsuccess = () => {
        const result = req.result as StoredMediaRecord | undefined;
        if (result) {
          memoryCache.set(mediaId, result);
          resolve(result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function deleteMediaItem(mediaId: string): Promise<boolean> {
  if (!mediaId) return false;
  memoryCache.delete(mediaId);

  const db = await getDb();
  if (!db) return true;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(mediaId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function getAllMediaMap(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [k, v] of memoryCache.entries()) {
    if (v.dataUrl) result[k] = v.dataUrl;
  }

  const db = await getDb();
  if (!db) return result;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = (req.result || []) as StoredMediaRecord[];
        for (const r of records) {
          if (r.mediaId && r.dataUrl) {
            result[r.mediaId] = r.dataUrl;
            memoryCache.set(r.mediaId, r);
          }
        }
        resolve(result);
      };
      req.onerror = () => resolve(result);
    } catch {
      resolve(result);
    }
  });
}
