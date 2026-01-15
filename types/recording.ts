// Recording types for the Court Record Transcriber app

export type RecordingStatus =
  | 'uploading'
  | 'processing'
  | 'transcribing'
  | 'completed'
  | 'failed';

export interface Recording {
  id: string;
  name: string;
  fileName: string;
  fileType: 'mp3' | 'wav' | 'm4a' | 'webm' | 'ogg';
  fileSize: number;
  duration: number; // in seconds
  audioBlob?: Blob; // stored in IndexedDB
  uploadedAt: string; // ISO date string
  uploadedBy: string; // User ID for scoping
  organizationId?: string;
  status: RecordingStatus;
  errorMessage?: string;
}

export interface Speaker {
  id: string;
  recordingId: string;
  label: string; // e.g., "Speaker 1", "Judge", "Witness"
  color: string; // for visual distinction
  createdAt: string;
}

export interface TranscriptSegment {
  id: string;
  recordingId: string;
  speakerId: string;
  speakerLabel: string;
  text: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  confidence: number;
  isEdited: boolean;
}

export interface Transcript {
  id: string;
  recordingId: string;
  segments: TranscriptSegment[];
  generatedAt: string;
  modelUsed: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// Active state for localStorage
export interface ActiveRecording {
  id: string;
  name: string;
  status: RecordingStatus;
  startedAt: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  defaultSpeakerLabels?: string[];
  autoSave?: boolean;
  playbackSpeed?: number;
}

// Export format options
export type ExportFormat = 'pdf' | 'docx' | 'txt';

export interface ExportOptions {
  format: ExportFormat;
  includeSpeakerLabels: boolean;
  includeTimestamps: boolean;
  headerText?: string;
  footerText?: string;
}
