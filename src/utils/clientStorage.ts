/**
 * Hybrid Client Persistent Storage (IndexedDB + localStorage)
 *
 * Browser `localStorage` is limited to ~5 MB per origin across all keys.
 * Because PM annual plans, multi-month daily inspection sheets, and ticket photos
 * can easily exceed 5 MB, writing solely to `localStorage` causes silent
 * `QuotaExceededError` failures and resets user edits back to defaults on refresh.
 *
 * This module persists every dataset durably in IndexedDB (hundreds of MB capacity)
 * while keeping `localStorage` synced for lightweight keys and instant hydration.
 */

const DB_NAME = 'koch_smart_maintenance_db';
const DB_VERSION = 1;
const STORE_NAME = 'kv_store';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB not available'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

export async function idbSet(key: string, value: any): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    // Ignore IDB errors in restricted environments
  }
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return null;
  }
}

export async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {}
}

/**
 * Save data to IndexedDB (primary, high capacity) and mirror to localStorage if within quota.
 * Returns the IndexedDB persistence promise so critical flows (e.g. restore before reload) can await it.
 */
export function savePersistentCache<T>(key: string, value: T, skipLocalStorageIfLarge = false): Promise<void> {
  // 1. Always persist full payload to IndexedDB
  const idbPromise = idbSet(key, value);

  // 2. Also mirror to localStorage for instant synchronous reload when size fits safely
  try {
    const serialized = JSON.stringify(value);
    if (skipLocalStorageIfLarge && serialized.length > 900_000) {
      // Remove stale localStorage entry if switching to IDB-primary so quota stays free for critical small keys
      try {
        localStorage.removeItem(key);
      } catch (e) {}
      return idbPromise;
    }
    localStorage.setItem(key, serialized);
  } catch (e) {
    // QuotaExceededError in localStorage is non-fatal because IndexedDB has the complete data
  }

  return idbPromise;
}

/**
 * Synchronous read from localStorage (used inside React useState initializers).
 */
export function loadSyncCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (e) {
    return null;
  }
}

/**
 * Asynchronous read checking IndexedDB first, falling back to localStorage.
 */
export async function loadAsyncCache<T>(key: string): Promise<T | null> {
  const fromIdb = await idbGet<T>(key);
  if (fromIdb !== null && fromIdb !== undefined) {
    return fromIdb;
  }
  return loadSyncCache<T>(key);
}
