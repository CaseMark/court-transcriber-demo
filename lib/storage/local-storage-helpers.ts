/**
 * localStorage Helpers for Court Record Transcriber
 *
 * Provides robust localStorage operations with:
 * - Date serialization/deserialization
 * - Error handling
 * - Debug logging
 * - Quota management
 */

const DEBUG = process.env.NODE_ENV === 'development';

// Centralized key definitions - prefix with app identifier
export const STORAGE_KEYS = {
  SESSION: 'crt:session',
  ACTIVE_RECORDING: 'crt:activeRecording',
  PREFERENCES: (userId: string) => `crt:prefs:${userId}`,
  ANONYMOUS_USER_ID: 'crt:anonymousUserId',
  STORAGE_VERSION: 'crt:version',
} as const;

// Current storage schema version
export const STORAGE_VERSION = 1;

// Session cookie name for middleware
export const LOCAL_SESSION_COOKIE = 'crt:local-session';

/**
 * Serialize dates to ISO strings for storage
 */
export function serializeDates<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (obj instanceof Date) {
    return obj.toISOString() as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeDates) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeDates(value);
    }
    return result as T;
  }

  return obj;
}

/**
 * Deserialize ISO strings back to Date objects
 */
export function deserializeDates<T>(obj: T, dateFields: string[] = []): T {
  if (obj === null || obj === undefined) return obj;

  const defaultDateFields = [
    'createdAt',
    'updatedAt',
    'uploadedAt',
    'startedAt',
    'generatedAt',
    'expiresAt',
  ];

  const allDateFields = [...new Set([...defaultDateFields, ...dateFields])];

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      deserializeDates(item, dateFields)
    ) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (allDateFields.includes(key) && typeof value === 'string') {
        const parsed = new Date(value);
        result[key] = isNaN(parsed.getTime()) ? value : parsed;
      } else if (typeof value === 'object') {
        result[key] = deserializeDates(value, dateFields);
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }

  return obj;
}

/**
 * Safe load with error handling and validation
 */
export function loadFromLocalStorage<T>(
  key: string,
  options?: {
    dateFields?: string[];
    validator?: (data: unknown) => data is T;
  }
): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawData = localStorage.getItem(key);

    if (!rawData) {
      if (DEBUG) {
        console.log(`[Storage] Key "${key}" not found in localStorage`);
      }
      return null;
    }

    const parsed = JSON.parse(rawData);
    const deserialized = deserializeDates<T>(parsed, options?.dateFields);

    // Optional validation
    if (options?.validator && !options.validator(deserialized)) {
      console.warn(`[Storage] Validation failed for key "${key}"`);
      return null;
    }

    if (DEBUG) {
      console.log(`[Storage] Loaded from "${key}":`, deserialized);
    }

    return deserialized;
  } catch (error) {
    console.error(`[Storage] Failed to load from "${key}":`, error);
    return null;
  }
}

/**
 * Safe save with error handling
 */
export function saveToLocalStorage<T>(key: string, data: T): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const serialized = serializeDates(data);
    const jsonString = JSON.stringify(serialized);

    localStorage.setItem(key, jsonString);

    if (DEBUG) {
      console.log(`[Storage] Saved to "${key}":`, {
        data: serialized,
        size: `${(jsonString.length / 1024).toFixed(2)} KB`,
      });
    }

    return true;
  } catch (error) {
    console.error(`[Storage] Failed to save to "${key}":`, error);

    // Handle quota exceeded
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('[Storage] localStorage quota exceeded');
    }

    return false;
  }
}

/**
 * Remove specific key
 */
export function removeFromLocalStorage(key: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.removeItem(key);
    if (DEBUG) {
      console.log(`[Storage] Removed key "${key}"`);
    }
    return true;
  } catch (error) {
    console.error(`[Storage] Failed to remove "${key}":`, error);
    return false;
  }
}

/**
 * Clear all app data (logout, reset)
 */
export function clearAllStorageData(): void {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];

    // Find all keys with our prefix
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('crt:')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));

    if (DEBUG) {
      console.log(`[Storage] Cleared ${keysToRemove.length} keys:`, keysToRemove);
    }
  } catch (error) {
    console.error('[Storage] Failed to clear all storage data:', error);
  }
}

/**
 * Set a cookie (for middleware session detection)
 */
export function setCookie(name: string, value: string, days: number = 7): void {
  if (typeof document === 'undefined') return;

  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Remove a cookie
 */
export function removeCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

/**
 * Get storage usage info
 */
export function getStorageInfo(): {
  used: number;
  available: number;
  items: number;
  appItems: number;
} {
  if (typeof window === 'undefined') {
    return { used: 0, available: 0, items: 0, appItems: 0 };
  }

  let used = 0;
  let appItems = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      if (value) {
        used += key.length + value.length;
      }
      if (key.startsWith('crt:')) {
        appItems++;
      }
    }
  }

  // localStorage typically has a 5MB limit
  const available = 5 * 1024 * 1024 - used;

  return {
    used,
    available,
    items: localStorage.length,
    appItems,
  };
}

/**
 * Generate anonymous user ID for demo mode
 */
export function getAnonymousUserId(): string {
  const key = STORAGE_KEYS.ANONYMOUS_USER_ID;
  let id = localStorage.getItem(key);

  if (!id) {
    id = `anon-${crypto.randomUUID()}`;
    localStorage.setItem(key, id);
  }

  return id;
}
