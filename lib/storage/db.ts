/**
 * IndexedDB Database Schema for Court Record Transcriber
 *
 * Uses Dexie.js for type-safe IndexedDB operations.
 * All data is stored locally in the browser - no server database needed.
 */

import Dexie, { type Table } from 'dexie';
import type {
  Recording,
  Speaker,
  TranscriptSegment,
  Transcript,
} from '@/types/recording';

// User and session types for client-side auth
export interface LocalUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface LocalOrganization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  createdAt: string;
}

export interface LocalMember {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  createdAt: string;
}

export class CourtTranscriberDatabase extends Dexie {
  // Typed table declarations
  recordings!: Table<Recording>;
  speakers!: Table<Speaker>;
  transcriptSegments!: Table<TranscriptSegment>;
  transcripts!: Table<Transcript>;

  // Auth tables (client-side)
  users!: Table<LocalUser>;
  sessions!: Table<LocalSession>;
  organizations!: Table<LocalOrganization>;
  members!: Table<LocalMember>;

  constructor() {
    super('CourtTranscriber'); // Database name

    // Schema definition - version 1
    this.version(1).stores({
      // Primary key is first, then indexed fields
      recordings: 'id, uploadedBy, organizationId, uploadedAt, status',
      speakers: 'id, recordingId',
      transcriptSegments: 'id, recordingId, speakerId, startTime',
      transcripts: 'id, recordingId, status',

      // Auth tables
      users: 'id, email',
      sessions: 'id, userId, token',
      organizations: 'id, slug',
      members: 'id, userId, organizationId',
    });
  }
}

// Singleton pattern - one database instance
let dbInstance: CourtTranscriberDatabase | null = null;

export function getDatabase(): CourtTranscriberDatabase {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser');
  }

  if (!dbInstance) {
    dbInstance = new CourtTranscriberDatabase();
  }

  return dbInstance;
}

// Browser environment check
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// Reset database (for testing or user-initiated clear)
export async function resetDatabase(): Promise<void> {
  if (!isBrowser()) return;

  const db = getDatabase();
  await db.delete();
  dbInstance = null;
}

// Get database instance (alias for getDatabase)
export const db = {
  get instance() {
    return getDatabase();
  },
};
