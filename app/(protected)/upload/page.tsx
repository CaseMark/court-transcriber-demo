'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUsage } from '@/lib/usage/usage-context';
import { LimitExceededDialog } from '@/components/demo';
import {
  saveRecording,
  updateRecordingStatus,
  saveTranscriptSegments,
  saveSpeakers,
  saveTranscript,
} from '@/lib/storage';
import type { Recording, Speaker, TranscriptSegment } from '@/types/recording';
import { getSpeakerColor, getSpeakerLabel } from '@/lib/case-dev/legal-vocabulary';
import {
  CloudArrowUp,
  FileAudio,
  X,
  CheckCircle,
  Warning,
  Spinner,
} from '@phosphor-icons/react';

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/webm', 'audio/ogg'];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

type FileTypeKey = 'mp3' | 'wav' | 'm4a' | 'webm' | 'ogg';

function getFileType(mimeType: string): FileTypeKey {
  const typeMap: Record<string, FileTypeKey> = {
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
  };
  return typeMap[mimeType] || 'mp3';
}

/**
 * Sanitize filename to ASCII-only characters
 * This works around a Next.js bug where non-ASCII filenames cause FormData parsing to fail
 * @see https://github.com/vercel/next.js/issues/76893
 */
function sanitizeFilename(filename: string): string {
  // Get the extension
  const lastDot = filename.lastIndexOf('.');
  const ext = lastDot > 0 ? filename.slice(lastDot) : '';
  const name = lastDot > 0 ? filename.slice(0, lastDot) : filename;

  // Replace non-ASCII and problematic characters with underscores
  const sanitized = name
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/[^\x00-\x7F]/g, '_') // Replace non-ASCII with underscore
    .replace(/[<>:"/\\|?*\s]/g, '_') // Replace problematic chars and spaces
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, ''); // Trim leading/trailing underscores

  return (sanitized || 'audio_file') + ext;
}

/**
 * Create a new File with a sanitized filename
 */
function createSanitizedFile(file: File): File {
  const sanitizedName = sanitizeFilename(file.name);
  if (sanitizedName === file.name) {
    return file; // No change needed
  }
  console.log(`[Upload] Sanitized filename: "${file.name}" -> "${sanitizedName}"`);
  return new File([file], sanitizedName, { type: file.type });
}

export default function UploadPage() {
  const router = useRouter();
  const { usage, checkResult, trackTranscription, refreshUsage } = useUsage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [recordingName, setRecordingName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<
    'idle' | 'uploading' | 'transcribing' | 'success' | 'error'
  >('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdRecordingId, setCreatedRecordingId] = useState<string | null>(null);
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && ACCEPTED_TYPES.includes(droppedFile.type)) {
      if (droppedFile.size > MAX_FILE_SIZE) {
        setErrorMessage('File size exceeds 500MB limit');
        return;
      }
      setFile(droppedFile);
      setRecordingName(droppedFile.name.replace(/\.[^/.]+$/, ''));
      setErrorMessage('');
    } else {
      setErrorMessage('Please upload an audio file (MP3, WAV, M4A, WebM, or OGG)');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
        setErrorMessage('Please upload an audio file (MP3, WAV, M4A, WebM, or OGG)');
        return;
      }
      if (selectedFile.size > MAX_FILE_SIZE) {
        setErrorMessage('File size exceeds 500MB limit');
        return;
      }
      setFile(selectedFile);
      setRecordingName(selectedFile.name.replace(/\.[^/.]+$/, ''));
      setErrorMessage('');
    }
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setRecordingName('');
    setErrorMessage('');
    setUploadState('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    // Check usage limits before starting
    refreshUsage();
    if (checkResult && !checkResult.isAllowed) {
      setShowLimitDialog(true);
      return;
    }

    setUploadState('uploading');
    setProgress(10);

    try {
      // Create recording record
      const recordingId = crypto.randomUUID();
      const recording: Recording = {
        id: recordingId,
        name: recordingName || file.name,
        fileName: file.name,
        fileType: getFileType(file.type),
        fileSize: file.size,
        duration: 0, // Will be updated after audio analysis
        audioBlob: file,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'anonymous', // No auth required
        status: 'uploading',
      };

      await saveRecording(recording);
      setProgress(20);

      // Update status to processing
      await updateRecordingStatus(recordingId, 'processing');
      setUploadState('transcribing');
      setProgress(30);

      // Call transcription API
      // Sanitize filename to work around Next.js FormData parsing bug with non-ASCII chars
      const sanitizedFile = createSanitizedFile(file);
      const formData = new FormData();
      formData.append('file', sanitizedFile);
      formData.append('recordingId', recordingId);

      // Include usage data in request headers for server-side validation
      const headers: HeadersInit = {};
      if (usage) {
        headers['X-Demo-Usage'] = JSON.stringify(usage);
      }

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers,
        body: formData,
      });

      setProgress(70);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Transcription failed' }));

        // Handle demo limit exceeded
        if (response.status === 429 && errorData.reason) {
          setShowLimitDialog(true);
          setUploadState('idle');
          return;
        }

        throw new Error(errorData.error || 'Transcription failed');
      }

      const result = await response.json();
      setProgress(85);

      // Track usage after successful transcription
      if (result.usage) {
        trackTranscription(result.usage.audioDurationSeconds, result.usage.costUsd);
      }

      // Create speakers first so we can map IDs to labels
      const uniqueSpeakerIds = Array.from(new Set<string>(result.segments.map((seg: { speaker: string }) => seg.speaker)));
      const speakerIdToLabel = new Map<string, string>();
      const speakers: Speaker[] = uniqueSpeakerIds.map((speakerId, index) => {
        const label = getSpeakerLabel(index);
        speakerIdToLabel.set(speakerId, label);
        return {
          id: speakerId,
          recordingId,
          label,
          color: getSpeakerColor(index),
          createdAt: new Date().toISOString(),
        };
      });

      // Save transcript segments with formatted speaker labels
      // Note: Case.dev API returns timestamps in milliseconds, convert to seconds
      const segments: TranscriptSegment[] = result.segments.map(
        (seg: { id: string; speaker: string; text: string; start: number; end: number; confidence: number }, index: number) => ({
          id: seg.id || `seg-${index}`,
          recordingId,
          speakerId: seg.speaker,
          speakerLabel: speakerIdToLabel.get(seg.speaker) || getSpeakerLabel(index),
          text: seg.text,
          startTime: seg.start / 1000, // Convert ms to seconds
          endTime: seg.end / 1000, // Convert ms to seconds
          confidence: seg.confidence || 0.9,
          isEdited: false,
        })
      );

      await saveTranscriptSegments(segments);

      await saveSpeakers(speakers);

      // Save transcript metadata
      await saveTranscript({
        id: crypto.randomUUID(),
        recordingId,
        segments: [],
        generatedAt: new Date().toISOString(),
        modelUsed: 'whisper',
        status: 'completed',
      });

      // Update recording with duration and status
      const updatedRecording: Recording = {
        ...recording,
        duration: result.duration || 0,
        status: 'completed',
      };
      await saveRecording(updatedRecording);

      setProgress(100);
      setUploadState('success');
      setCreatedRecordingId(recordingId);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const handleViewRecording = () => {
    if (createdRecordingId) {
      router.push(`/recording/${createdRecordingId}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Upload Recording</h1>
          <p className="text-muted-foreground mt-2">
            Upload a court recording to transcribe. We support MP3, WAV, M4A,
            WebM, and OGG formats up to 500MB.
          </p>
        </div>

        {uploadState === 'success' ? (
          <div className="border bg-card p-8 text-center space-y-4">
            <div className="mx-auto h-16 w-16 bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" weight="fill" />
            </div>
            <h2 className="text-xl font-semibold">Transcription Complete</h2>
            <p className="text-muted-foreground">
              Your recording has been transcribed successfully.
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <Button variant="outline" onClick={clearFile}>
                Upload Another
              </Button>
              <Button onClick={handleViewRecording}>View Transcript</Button>
            </div>
          </div>
        ) : uploadState === 'error' ? (
          <div className="border bg-card p-8 text-center space-y-4">
            <div className="mx-auto h-16 w-16 bg-red-100 flex items-center justify-center">
              <Warning className="h-8 w-8 text-red-600" weight="fill" />
            </div>
            <h2 className="text-xl font-semibold">Upload Failed</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
            <Button
              variant="outline"
              onClick={() => {
                setUploadState('idle');
                setErrorMessage('');
              }}
            >
              Try Again
            </Button>
          </div>
        ) : uploadState === 'uploading' || uploadState === 'transcribing' ? (
          <div className="border bg-card p-8 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {uploadState === 'uploading'
                    ? 'Uploading...'
                    : 'Transcribing...'}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Spinner className="h-5 w-5 animate-spin" />
              <span>
                {uploadState === 'uploading'
                  ? 'Uploading your recording...'
                  : 'Transcribing with AI speaker detection...'}
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed p-12 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : file
                  ? 'border-green-500 bg-green-50'
                  : 'border-border hover:border-primary/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-4">
                  <div className="mx-auto h-16 w-16 bg-green-100 flex items-center justify-center">
                    <FileAudio className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={clearFile}>
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mx-auto h-16 w-16 bg-muted flex items-center justify-center">
                    <CloudArrowUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Drop your audio file here</p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES.join(',')}
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse Files
                  </Button>
                </div>
              )}
            </div>

            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}

            {/* Recording Name */}
            {file && (
              <div className="space-y-2">
                <Label htmlFor="name">Recording Name</Label>
                <Input
                  id="name"
                  value={recordingName}
                  onChange={(e) => setRecordingName(e.target.value)}
                  placeholder="e.g., Smith v. Johnson Hearing"
                />
                <p className="text-xs text-muted-foreground">
                  Give your recording a descriptive name for easy identification.
                </p>
              </div>
            )}

            {/* Upload Button */}
            {file && (
              <Button className="w-full" size="lg" onClick={handleUpload}>
                <CloudArrowUp className="h-5 w-5 mr-2" />
                Upload & Transcribe
              </Button>
            )}
          </>
        )}
      </div>

      {/* Demo Limit Exceeded Dialog */}
      <LimitExceededDialog
        open={showLimitDialog}
        onOpenChange={setShowLimitDialog}
      />
    </div>
  );
}
