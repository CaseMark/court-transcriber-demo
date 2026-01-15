/**
 * Unified Storage Operations for Court Record Transcriber
 *
 * CRUD operations for recordings, transcripts, and speakers.
 * All data is stored locally in IndexedDB.
 */

import { getDatabase, isBrowser } from './db';
import {
  loadFromLocalStorage,
  saveToLocalStorage,
  removeFromLocalStorage,
  STORAGE_KEYS,
} from './local-storage-helpers';
import type {
  Recording,
  Speaker,
  TranscriptSegment,
  Transcript,
  ActiveRecording,
  UserPreferences,
} from '@/types/recording';

const DEBUG = process.env.NODE_ENV === 'development';

// =============================================================================
// RECORDINGS
// =============================================================================

/**
 * Save a recording to IndexedDB
 */
export async function saveRecording(recording: Recording): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.recordings.put(recording);

    if (DEBUG) {
      console.log('[Storage] Saved recording:', {
        id: recording.id,
        name: recording.name,
      });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to save recording:', error);
    return false;
  }
}

/**
 * Get a recording by ID
 */
export async function getRecording(id: string): Promise<Recording | undefined> {
  if (!isBrowser()) return undefined;

  try {
    const db = getDatabase();
    return await db.recordings.get(id);
  } catch (error) {
    console.error('[Storage] Failed to get recording:', error);
    return undefined;
  }
}

/**
 * List all recordings
 */
export async function listRecordings(): Promise<Recording[]> {
  if (!isBrowser()) return [];

  try {
    const db = getDatabase();

    const recordings = await db.recordings.toArray();

    // Sort by upload date (newest first)
    return recordings.sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  } catch (error) {
    console.error('[Storage] Failed to list recordings:', error);
    return [];
  }
}

/**
 * Update recording status
 */
export async function updateRecordingStatus(
  id: string,
  status: Recording['status'],
  errorMessage?: string
): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.recordings.update(id, { status, errorMessage });
    return true;
  } catch (error) {
    console.error('[Storage] Failed to update recording status:', error);
    return false;
  }
}

/**
 * Delete a recording and all associated data
 */
export async function deleteRecording(id: string): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();

    // Delete associated data first (cascade)
    await db.speakers.where('recordingId').equals(id).delete();
    await db.transcriptSegments.where('recordingId').equals(id).delete();
    await db.transcripts.where('recordingId').equals(id).delete();
    await db.recordings.delete(id);

    if (DEBUG) {
      console.log('[Storage] Deleted recording:', { id });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to delete recording:', error);
    return false;
  }
}

// =============================================================================
// SPEAKERS
// =============================================================================

/**
 * Save speakers for a recording
 */
export async function saveSpeakers(speakers: Speaker[]): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.speakers.bulkPut(speakers);

    if (DEBUG) {
      console.log('[Storage] Saved speakers:', { count: speakers.length });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to save speakers:', error);
    return false;
  }
}

/**
 * Get speakers for a recording
 */
export async function getSpeakers(recordingId: string): Promise<Speaker[]> {
  if (!isBrowser()) return [];

  try {
    const db = getDatabase();
    return await db.speakers.where('recordingId').equals(recordingId).toArray();
  } catch (error) {
    console.error('[Storage] Failed to get speakers:', error);
    return [];
  }
}

/**
 * Update a speaker label
 */
export async function updateSpeakerLabel(
  id: string,
  label: string
): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.speakers.update(id, { label });
    return true;
  } catch (error) {
    console.error('[Storage] Failed to update speaker label:', error);
    return false;
  }
}

/**
 * Add a new speaker
 */
export async function addSpeaker(speaker: Speaker): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.speakers.add(speaker);

    if (DEBUG) {
      console.log('[Storage] Added speaker:', { id: speaker.id, label: speaker.label });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to add speaker:', error);
    return false;
  }
}

// =============================================================================
// TRANSCRIPT SEGMENTS
// =============================================================================

/**
 * Save transcript segments
 */
export async function saveTranscriptSegments(
  segments: TranscriptSegment[]
): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.transcriptSegments.bulkPut(segments);

    if (DEBUG) {
      console.log('[Storage] Saved transcript segments:', {
        count: segments.length,
      });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to save transcript segments:', error);
    return false;
  }
}

/**
 * Get transcript segments for a recording
 */
export async function getTranscriptSegments(
  recordingId: string
): Promise<TranscriptSegment[]> {
  if (!isBrowser()) return [];

  try {
    const db = getDatabase();
    const segments = await db.transcriptSegments
      .where('recordingId')
      .equals(recordingId)
      .toArray();

    // Sort by start time
    return segments.sort((a, b) => a.startTime - b.startTime);
  } catch (error) {
    console.error('[Storage] Failed to get transcript segments:', error);
    return [];
  }
}

/**
 * Update a transcript segment (for editing)
 */
export async function updateTranscriptSegment(
  id: string,
  updates: Partial<TranscriptSegment>
): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.transcriptSegments.update(id, { ...updates, isEdited: true });
    return true;
  } catch (error) {
    console.error('[Storage] Failed to update transcript segment:', error);
    return false;
  }
}

/**
 * Add a new transcript segment
 */
export async function addTranscriptSegment(
  segment: TranscriptSegment
): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.transcriptSegments.add(segment);

    if (DEBUG) {
      console.log('[Storage] Added transcript segment:', { id: segment.id });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to add transcript segment:', error);
    return false;
  }
}

/**
 * Delete a transcript segment
 */
export async function deleteTranscriptSegment(id: string): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.transcriptSegments.delete(id);

    if (DEBUG) {
      console.log('[Storage] Deleted transcript segment:', { id });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to delete transcript segment:', error);
    return false;
  }
}

/**
 * Replace all segments for a recording (for bulk operations like split/merge)
 */
export async function replaceTranscriptSegments(
  recordingId: string,
  segments: TranscriptSegment[]
): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();

    // Delete existing segments for this recording
    await db.transcriptSegments.where('recordingId').equals(recordingId).delete();

    // Add new segments
    await db.transcriptSegments.bulkPut(segments);

    if (DEBUG) {
      console.log('[Storage] Replaced transcript segments:', {
        recordingId,
        count: segments.length,
      });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to replace transcript segments:', error);
    return false;
  }
}

// =============================================================================
// TRANSCRIPTS
// =============================================================================

/**
 * Save a transcript
 */
export async function saveTranscript(transcript: Transcript): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.transcripts.put(transcript);

    if (DEBUG) {
      console.log('[Storage] Saved transcript:', { id: transcript.id });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to save transcript:', error);
    return false;
  }
}

/**
 * Get transcript for a recording
 */
export async function getTranscript(
  recordingId: string
): Promise<Transcript | undefined> {
  if (!isBrowser()) return undefined;

  try {
    const db = getDatabase();
    return await db.transcripts
      .where('recordingId')
      .equals(recordingId)
      .first();
  } catch (error) {
    console.error('[Storage] Failed to get transcript:', error);
    return undefined;
  }
}

// =============================================================================
// LOCAL STORAGE STATE
// =============================================================================

/**
 * Get active recording state
 */
export function getActiveRecording(): ActiveRecording | null {
  return loadFromLocalStorage<ActiveRecording>(STORAGE_KEYS.ACTIVE_RECORDING, {
    dateFields: ['startedAt'],
  });
}

/**
 * Set active recording state
 */
export function setActiveRecording(recording: ActiveRecording | null): void {
  if (recording) {
    saveToLocalStorage(STORAGE_KEYS.ACTIVE_RECORDING, recording);
  } else {
    removeFromLocalStorage(STORAGE_KEYS.ACTIVE_RECORDING);
  }
}

/**
 * Get user preferences
 */
export function getUserPreferences(userId: string): UserPreferences | null {
  return loadFromLocalStorage<UserPreferences>(STORAGE_KEYS.PREFERENCES(userId));
}

/**
 * Save user preferences
 */
export function setUserPreferences(
  userId: string,
  preferences: UserPreferences
): boolean {
  return saveToLocalStorage(STORAGE_KEYS.PREFERENCES(userId), preferences);
}

// Re-export everything from sub-modules
export * from './db';
export * from './local-storage-helpers';
