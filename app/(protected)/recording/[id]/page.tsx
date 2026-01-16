'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  getRecording,
  getTranscriptSegments,
  getSpeakers,
  updateSpeakerLabel,
  updateTranscriptSegment,
  replaceTranscriptSegments,
  addSpeaker as addSpeakerToStorage,
  updateRecordingName,
} from '@/lib/storage';
import { getSpeakerColor as getDefaultSpeakerColor, getSpeakerLabel as getDefaultSpeakerLabel } from '@/lib/case-dev/legal-vocabulary';
import {
  generateExportPreview,
  downloadFromPreview,
  revokePreview,
  type ExportPreviewData,
} from '@/lib/export';
import type { Recording, TranscriptSegment, Speaker } from '@/types/recording';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  SpeakerHigh,
  SpeakerSlash,
  MagnifyingGlass,
  Download,
  ArrowLeft,
  Pencil,
  Check,
  X,
  Spinner,
  TextAa,
  UserSwitch,
  ArrowCounterClockwise,
  Plus,
  UserPlus,
} from '@phosphor-icons/react';

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface TextSelection {
  segmentId: string;
  segmentIndex: number;
  text: string;
  startOffset: number;
  endOffset: number;
  rect: DOMRect;
}

interface EditPhraseState {
  segmentId: string;
  segmentIndex: number;
  originalText: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  newText: string;
}

interface EditSpeakerState {
  segmentId: string;
  segmentIndex: number;
  originalText: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  newSpeakerId: string;
  isCreatingNewSpeaker?: boolean;
  newSpeakerName?: string;
}

interface EditHistoryEntry {
  segments: TranscriptSegment[];
  speakers: Speaker[];
  description: string;
}

export default function RecordingPage() {
  const params = useParams();
  const router = useRouter();
  const recordingId = params.id as string;

  // State
  const [recording, setRecording] = useState<Recording | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Audio state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Segment refs for auto-scrolling
  const segmentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  // Edit state for segment text (legacy full segment edit)
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Speaker editing in sidebar
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [editingSpeakerLabel, setEditingSpeakerLabel] = useState('');

  // Text selection state
  const [textSelection, setTextSelection] = useState<TextSelection | null>(null);
  const selectionPopupRef = useRef<HTMLDivElement>(null);

  // Edit phrase modal state
  const [editPhraseState, setEditPhraseState] = useState<EditPhraseState | null>(null);

  // Edit speaker modal state
  const [editSpeakerState, setEditSpeakerState] = useState<EditSpeakerState | null>(null);

  // Edit history for undo functionality
  const [editHistory, setEditHistory] = useState<EditHistoryEntry[]>([]);

  // New speaker creation in sidebar
  const [isAddingSpeaker, setIsAddingSpeaker] = useState(false);
  const [newSpeakerName, setNewSpeakerName] = useState('');

  // Recording name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');

  // Export preview state
  const [exportPreview, setExportPreview] = useState<ExportPreviewData | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Load recording data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [recordingData, segmentsData, speakersData] = await Promise.all([
          getRecording(recordingId),
          getTranscriptSegments(recordingId),
          getSpeakers(recordingId),
        ]);

        if (!recordingData) {
          setError('Recording not found');
          return;
        }

        setRecording(recordingData);
        setSpeakers(speakersData);

        // Detect if timestamps are in milliseconds (legacy data from before fix)
        // If any segment's startTime exceeds the recording duration, timestamps are in ms
        const needsConversion = segmentsData.length > 0 &&
          recordingData.duration > 0 &&
          segmentsData.some(seg => seg.startTime > recordingData.duration * 2);

        if (needsConversion) {
          console.log('[Recording] Converting timestamps from ms to seconds');
          const convertedSegments = segmentsData.map(seg => ({
            ...seg,
            startTime: seg.startTime / 1000,
            endTime: seg.endTime / 1000,
          }));
          setSegments(convertedSegments);
        } else {
          setSegments(segmentsData);
        }

        // Create audio URL from blob
        if (recordingData.audioBlob) {
          const url = URL.createObjectURL(recordingData.audioBlob);
          setAudioUrl(url);
        }
      } catch (err) {
        console.error('Failed to load recording:', err);
        setError('Failed to load recording');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();

    // Cleanup
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [recordingId]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  // Handle text selection
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) {
        // Small delay to allow click events to fire first
        setTimeout(() => setTextSelection(null), 100);
        return;
      }

      const selectedText = selection.toString().trim();
      if (!selectedText) {
        setTextSelection(null);
        return;
      }

      // Find the segment element
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const segmentEl = (container.nodeType === Node.TEXT_NODE
        ? container.parentElement
        : container as Element
      )?.closest('[data-segment-id]');

      if (!segmentEl) {
        setTextSelection(null);
        return;
      }

      const segmentId = segmentEl.getAttribute('data-segment-id');
      const segmentIndex = parseInt(segmentEl.getAttribute('data-segment-index') || '-1', 10);

      if (!segmentId || segmentIndex < 0) {
        setTextSelection(null);
        return;
      }

      const segment = segments[segmentIndex];
      if (!segment) {
        setTextSelection(null);
        return;
      }

      // Calculate offsets within the segment text
      const fullText = segment.text;
      const startOffset = fullText.indexOf(selectedText);
      const endOffset = startOffset + selectedText.length;

      if (startOffset < 0) {
        setTextSelection(null);
        return;
      }

      const rect = range.getBoundingClientRect();

      setTextSelection({
        segmentId,
        segmentIndex,
        text: selectedText,
        startOffset,
        endOffset,
        rect,
      });
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [segments]);

  // Close selection popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        selectionPopupRef.current &&
        !selectionPopupRef.current.contains(e.target as Node)
      ) {
        setTextSelection(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get current segment based on playback time
  const getCurrentSegmentIndex = useCallback(() => {
    for (let i = segments.length - 1; i >= 0; i--) {
      if (currentTime >= segments[i].startTime) {
        return i;
      }
    }
    return -1;
  }, [currentTime, segments]);

  const currentSegmentIndex = getCurrentSegmentIndex();

  // Scroll to current segment helper
  const scrollToCurrentSegment = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (currentSegmentIndex < 0) return;

    const currentSegment = segments[currentSegmentIndex];
    if (!currentSegment) return;

    const segmentEl = segmentRefs.current.get(currentSegment.id);
    if (segmentEl && transcriptContainerRef.current) {
      segmentEl.scrollIntoView({
        behavior,
        block: 'center',
      });
    }
  }, [currentSegmentIndex, segments]);

  // Auto-scroll during playback - always follow the current segment
  useEffect(() => {
    if (!isPlaying || currentSegmentIndex < 0) return;
    scrollToCurrentSegment('smooth');
  }, [currentSegmentIndex, isPlaying, scrollToCurrentSegment]);

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = segments
      .map((seg, index) => ({ index, match: seg.text.toLowerCase().includes(query) }))
      .filter((r) => r.match)
      .map((r) => r.index);

    setSearchResults(results);
    setCurrentSearchIndex(0);
  }, [searchQuery, segments]);

  // Audio controls
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(time, duration));
  };

  const skipBack = () => seek(currentTime - 5);
  const skipForward = () => seek(currentTime + 5);
  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setIsMuted(!isMuted);
  };

  // Navigate to segment time
  const goToSegment = (segment: TranscriptSegment) => {
    seek(segment.startTime);
    const audio = audioRef.current;
    if (audio && !isPlaying) {
      audio.play();
      setIsPlaying(true);
    }
  };

  // Search navigation
  const goToSearchResult = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;

    let newIndex = currentSearchIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    }
    setCurrentSearchIndex(newIndex);

    // Scroll to and highlight the result
    const segmentIndex = searchResults[newIndex];
    const segment = segments[segmentIndex];
    if (segment) {
      goToSegment(segment);
    }
  };

  // Legacy full segment edit handlers
  const startEditingSegment = (segment: TranscriptSegment) => {
    setEditingSegmentId(segment.id);
    setEditingText(segment.text);
  };

  const saveSegmentEdit = async () => {
    if (!editingSegmentId) return;
    await updateTranscriptSegment(editingSegmentId, { text: editingText });
    setSegments((prev) =>
      prev.map((seg) =>
        seg.id === editingSegmentId ? { ...seg, text: editingText, isEdited: true } : seg
      )
    );
    setEditingSegmentId(null);
    setEditingText('');
  };

  const cancelSegmentEdit = () => {
    setEditingSegmentId(null);
    setEditingText('');
  };

  // Speaker sidebar edit handlers
  const startEditingSpeaker = (speaker: Speaker) => {
    setEditingSpeakerId(speaker.id);
    setEditingSpeakerLabel(speaker.label);
  };

  const saveSpeakerEdit = async () => {
    if (!editingSpeakerId) return;
    await updateSpeakerLabel(editingSpeakerId, editingSpeakerLabel);
    setSpeakers((prev) =>
      prev.map((sp) =>
        sp.id === editingSpeakerId ? { ...sp, label: editingSpeakerLabel } : sp
      )
    );
    setEditingSpeakerId(null);
    setEditingSpeakerLabel('');
  };

  const cancelSpeakerEdit = () => {
    setEditingSpeakerId(null);
    setEditingSpeakerLabel('');
  };

  // Push current state to edit history (for undo)
  const pushToEditHistory = useCallback((description: string) => {
    setEditHistory((prev) => [
      ...prev.slice(-9), // Keep last 10 entries
      {
        segments: [...segments],
        speakers: [...speakers],
        description,
      },
    ]);
  }, [segments, speakers]);

  // Undo last edit
  const undoLastEdit = useCallback(async () => {
    if (editHistory.length === 0 || !recording) return;

    const lastEntry = editHistory[editHistory.length - 1];

    // Restore segments and speakers
    await replaceTranscriptSegments(recording.id, lastEntry.segments);
    setSegments(lastEntry.segments);
    setSpeakers(lastEntry.speakers);

    // Remove the entry from history
    setEditHistory((prev) => prev.slice(0, -1));
  }, [editHistory, recording]);

  // Create a new speaker
  const createNewSpeaker = useCallback(async (name: string): Promise<Speaker | null> => {
    if (!recording || !name.trim()) return null;

    const newSpeaker: Speaker = {
      id: `speaker-${Date.now()}`,
      recordingId: recording.id,
      label: name.trim(),
      color: getDefaultSpeakerColor(speakers.length),
      createdAt: new Date().toISOString(),
    };

    const success = await addSpeakerToStorage(newSpeaker);
    if (success) {
      setSpeakers((prev) => [...prev, newSpeaker]);
      return newSpeaker;
    }
    return null;
  }, [recording, speakers.length]);

  // Add new speaker from sidebar
  const handleAddSpeakerFromSidebar = async () => {
    if (!newSpeakerName.trim()) return;

    await createNewSpeaker(newSpeakerName);
    setNewSpeakerName('');
    setIsAddingSpeaker(false);
  };

  // Handle inline speaker name click (in transcript)
  const handleSpeakerNameClick = (e: React.MouseEvent, speaker: Speaker) => {
    e.stopPropagation();
    startEditingSpeaker(speaker);
  };

  // Text selection action handlers
  const handleEditPhrase = () => {
    if (!textSelection) return;

    const segment = segments[textSelection.segmentIndex];
    if (!segment) return;

    setEditPhraseState({
      segmentId: textSelection.segmentId,
      segmentIndex: textSelection.segmentIndex,
      originalText: segment.text,
      selectedText: textSelection.text,
      startOffset: textSelection.startOffset,
      endOffset: textSelection.endOffset,
      newText: textSelection.text,
    });

    setTextSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleEditSpeaker = () => {
    if (!textSelection) return;

    const segment = segments[textSelection.segmentIndex];
    if (!segment) return;

    setEditSpeakerState({
      segmentId: textSelection.segmentId,
      segmentIndex: textSelection.segmentIndex,
      originalText: segment.text,
      selectedText: textSelection.text,
      startOffset: textSelection.startOffset,
      endOffset: textSelection.endOffset,
      newSpeakerId: segment.speakerId,
    });

    setTextSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  // Save edited phrase
  const saveEditedPhrase = async () => {
    if (!editPhraseState) return;

    const segment = segments[editPhraseState.segmentIndex];
    if (!segment) return;

    // Push current state to history for undo
    pushToEditHistory('Edit phrase');

    // Construct the new full text
    const before = editPhraseState.originalText.slice(0, editPhraseState.startOffset);
    const after = editPhraseState.originalText.slice(editPhraseState.endOffset);
    const newFullText = before + editPhraseState.newText + after;

    // Update in storage
    await updateTranscriptSegment(segment.id, { text: newFullText });

    // Update local state
    setSegments((prev) =>
      prev.map((seg) =>
        seg.id === segment.id ? { ...seg, text: newFullText, isEdited: true } : seg
      )
    );

    setEditPhraseState(null);
  };

  // Save speaker change with split/merge logic
  const saveSpeakerChange = async () => {
    if (!editSpeakerState || !recording) return;

    const segmentIndex = editSpeakerState.segmentIndex;
    const segment = segments[segmentIndex];
    if (!segment) return;

    const { originalText, startOffset, endOffset, isCreatingNewSpeaker, newSpeakerName } = editSpeakerState;
    let { newSpeakerId } = editSpeakerState;

    // Handle creating new speaker
    if (isCreatingNewSpeaker && newSpeakerName) {
      const newSpeaker = await createNewSpeaker(newSpeakerName);
      if (!newSpeaker) {
        return; // Failed to create speaker
      }
      newSpeakerId = newSpeaker.id;
    }

    // If same speaker, nothing to do
    if (newSpeakerId === segment.speakerId) {
      setEditSpeakerState(null);
      return;
    }

    // Push current state to history for undo
    pushToEditHistory('Change speaker');

    const beforeText = originalText.slice(0, startOffset).trim();
    const selectedText = originalText.slice(startOffset, endOffset).trim();
    const afterText = originalText.slice(endOffset).trim();

    const prevSegment = segmentIndex > 0 ? segments[segmentIndex - 1] : null;
    const nextSegment = segmentIndex < segments.length - 1 ? segments[segmentIndex + 1] : null;

    let newSegments = [...segments];

    // Calculate timing (distribute proportionally based on text length)
    const totalLength = originalText.length;
    const segmentDuration = segment.endTime - segment.startTime;

    const beforeEndTime = segment.startTime + (startOffset / totalLength) * segmentDuration;
    const selectedEndTime = segment.startTime + (endOffset / totalLength) * segmentDuration;

    // Case 1: Selection at the beginning
    if (!beforeText && selectedText) {
      // Check if previous segment has the target speaker
      if (prevSegment && prevSegment.speakerId === newSpeakerId) {
        // Merge with previous segment
        const mergedText = prevSegment.text + ' ' + selectedText;
        newSegments = newSegments.map((seg) =>
          seg.id === prevSegment.id
            ? { ...seg, text: mergedText, endTime: selectedEndTime, isEdited: true }
            : seg
        );

        if (afterText) {
          // Update current segment with remaining text
          newSegments = newSegments.map((seg) =>
            seg.id === segment.id
              ? { ...seg, text: afterText, startTime: selectedEndTime, isEdited: true }
              : seg
          );
        } else {
          // Remove current segment entirely
          newSegments = newSegments.filter((seg) => seg.id !== segment.id);
        }
      } else {
        // Create new segment for selected text
        if (afterText) {
          // Split: [new selected segment] [remaining segment]
          const newSeg: TranscriptSegment = {
            id: `seg-${Date.now()}-new`,
            recordingId: recording.id,
            speakerId: newSpeakerId,
            speakerLabel: getSpeakerLabel(newSpeakerId),
            text: selectedText,
            startTime: segment.startTime,
            endTime: selectedEndTime,
            confidence: segment.confidence,
            isEdited: true,
          };

          newSegments = newSegments.map((seg) =>
            seg.id === segment.id
              ? { ...seg, text: afterText, startTime: selectedEndTime, isEdited: true }
              : seg
          );

          // Insert new segment before the current one
          const idx = newSegments.findIndex((seg) => seg.id === segment.id);
          newSegments.splice(idx, 0, newSeg);
        } else {
          // Just change the speaker of the whole segment
          newSegments = newSegments.map((seg) =>
            seg.id === segment.id
              ? { ...seg, speakerId: newSpeakerId, isEdited: true }
              : seg
          );
        }
      }
    }
    // Case 2: Selection at the end
    else if (!afterText && selectedText) {
      // Check if next segment has the target speaker
      if (nextSegment && nextSegment.speakerId === newSpeakerId) {
        // Merge with next segment
        const mergedText = selectedText + ' ' + nextSegment.text;
        newSegments = newSegments.map((seg) =>
          seg.id === nextSegment.id
            ? { ...seg, text: mergedText, startTime: beforeEndTime, isEdited: true }
            : seg
        );

        if (beforeText) {
          // Update current segment with remaining text
          newSegments = newSegments.map((seg) =>
            seg.id === segment.id
              ? { ...seg, text: beforeText, endTime: beforeEndTime, isEdited: true }
              : seg
          );
        } else {
          // Remove current segment entirely
          newSegments = newSegments.filter((seg) => seg.id !== segment.id);
        }
      } else {
        // Create new segment for selected text
        if (beforeText) {
          // Split: [remaining segment] [new selected segment]
          const newSeg: TranscriptSegment = {
            id: `seg-${Date.now()}-new`,
            recordingId: recording.id,
            speakerId: newSpeakerId,
            speakerLabel: getSpeakerLabel(newSpeakerId),
            text: selectedText,
            startTime: beforeEndTime,
            endTime: segment.endTime,
            confidence: segment.confidence,
            isEdited: true,
          };

          newSegments = newSegments.map((seg) =>
            seg.id === segment.id
              ? { ...seg, text: beforeText, endTime: beforeEndTime, isEdited: true }
              : seg
          );

          // Insert new segment after the current one
          const idx = newSegments.findIndex((seg) => seg.id === segment.id);
          newSegments.splice(idx + 1, 0, newSeg);
        } else {
          // Just change the speaker of the whole segment
          newSegments = newSegments.map((seg) =>
            seg.id === segment.id
              ? { ...seg, speakerId: newSpeakerId, isEdited: true }
              : seg
          );
        }
      }
    }
    // Case 3: Selection in the middle
    else if (beforeText && afterText && selectedText) {
      // Split into three segments: [before] [selected with new speaker] [after]
      const beforeSeg: TranscriptSegment = {
        ...segment,
        id: segment.id, // Keep original ID for first part
        text: beforeText,
        endTime: beforeEndTime,
        isEdited: true,
      };

      const selectedSeg: TranscriptSegment = {
        id: `seg-${Date.now()}-selected`,
        recordingId: recording.id,
        speakerId: newSpeakerId,
        speakerLabel: getSpeakerLabel(newSpeakerId),
        text: selectedText,
        startTime: beforeEndTime,
        endTime: selectedEndTime,
        confidence: segment.confidence,
        isEdited: true,
      };

      const afterSeg: TranscriptSegment = {
        id: `seg-${Date.now()}-after`,
        recordingId: recording.id,
        speakerId: segment.speakerId,
        speakerLabel: segment.speakerLabel,
        text: afterText,
        startTime: selectedEndTime,
        endTime: segment.endTime,
        confidence: segment.confidence,
        isEdited: true,
      };

      // Replace the original segment with three new ones
      const idx = newSegments.findIndex((seg) => seg.id === segment.id);
      newSegments.splice(idx, 1, beforeSeg, selectedSeg, afterSeg);
    }

    // Sort by start time and save
    newSegments.sort((a, b) => a.startTime - b.startTime);
    await replaceTranscriptSegments(recording.id, newSegments);
    setSegments(newSegments);
    setEditSpeakerState(null);
  };

  // Export preview handler for all formats
  const handleExportPreview = async (format: 'txt' | 'docx' | 'pdf') => {
    if (!recording || isGeneratingPreview) return;

    setIsGeneratingPreview(true);
    try {
      const preview = await generateExportPreview(recording, segments, speakers, {
        format,
        includeSpeakerLabels: true,
        includeTimestamps: true,
      });
      setExportPreview(preview);
    } catch (error) {
      console.error('Failed to generate export preview:', error);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Download from preview
  const handleExportDownload = () => {
    if (exportPreview) {
      downloadFromPreview(exportPreview);
    }
  };

  // Close export preview
  const closeExportPreview = () => {
    if (exportPreview) {
      revokePreview(exportPreview);
      setExportPreview(null);
    }
  };

  // Recording name editing
  const startEditingName = () => {
    if (!recording) return;
    setEditingNameValue(recording.name);
    setIsEditingName(true);
  };

  const saveNameEdit = async () => {
    if (!recording || !editingNameValue.trim()) return;
    await updateRecordingName(recording.id, editingNameValue.trim());
    setRecording({ ...recording, name: editingNameValue.trim() });
    setIsEditingName(false);
    setEditingNameValue('');
  };

  const cancelNameEdit = () => {
    setIsEditingName(false);
    setEditingNameValue('');
  };

  // Get speaker color
  const getSpeakerColor = useCallback(
    (speakerId: string) => {
      const speaker = speakers.find((s) => s.id === speakerId);
      return speaker?.color || '#6b7280';
    },
    [speakers]
  );

  // Get speaker label
  const getSpeakerLabel = useCallback(
    (speakerId: string) => {
      const speaker = speakers.find((s) => s.id === speakerId);
      return speaker?.label || speakerId;
    },
    [speakers]
  );

  // Get speaker by ID
  const getSpeaker = useCallback(
    (speakerId: string) => {
      return speakers.find((s) => s.id === speakerId);
    },
    [speakers]
  );

  // Render text with progress highlighting (spoken text in grey) and search highlighting
  const renderTextWithProgress = (text: string, progress: number, isPlaying: boolean) => {
    // Calculate character index based on progress percentage
    const charIndex = isPlaying && progress > 0 ? Math.floor((progress / 100) * text.length) : 0;

    // Split text into spoken and unspoken parts
    const spokenText = text.slice(0, charIndex);
    const unspokenText = text.slice(charIndex);

    // Helper to apply search highlighting
    const applySearchHighlight = (str: string, baseClass: string) => {
      if (!searchQuery.trim()) {
        return <span className={baseClass}>{str}</span>;
      }
      const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return str.split(regex).map((part, index) =>
        part.toLowerCase() === searchQuery.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={index} className={baseClass}>{part}</span>
        )
      );
    };

    if (!isPlaying || charIndex === 0) {
      // Not playing or no progress - just show search highlighting
      return applySearchHighlight(text, '');
    }

    return (
      <>
        {spokenText && applySearchHighlight(spokenText, 'text-muted-foreground')}
        {unspokenText && applySearchHighlight(unspokenText, '')}
      </>
    );
  };

  // Highlight search term in text (legacy - used when not current segment)
  const highlightText = (text: string) => {
    if (!searchQuery.trim()) return text;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split(regex).map((part, index) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Calculate progress within current segment for visual feedback
  const getSegmentProgress = (segment: TranscriptSegment) => {
    if (currentTime < segment.startTime || currentTime > segment.endTime) return 0;
    const segmentDuration = segment.endTime - segment.startTime;
    if (segmentDuration <= 0) return 0;
    return ((currentTime - segment.startTime) / segmentDuration) * 100;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">{error || 'Recording not found'}</p>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editingNameValue}
                    onChange={(e) => setEditingNameValue(e.target.value)}
                    className="h-8 text-lg font-semibold w-64"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveNameEdit();
                      if (e.key === 'Escape') cancelNameEdit();
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={saveNameEdit}
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={cancelNameEdit}
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 className="text-xl font-semibold leading-tight">{recording.name}</h1>
                  <button
                    onClick={startEditingName}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                    title="Edit transcription name"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              )}
              <p className="text-sm text-muted-foreground leading-tight">
                {formatTime(duration || recording.duration || 0)} total
              </p>
            </div>
          </div>

          {/* Export buttons - all with preview */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportPreview('txt')}
              disabled={isGeneratingPreview}
            >
              {isGeneratingPreview ? (
                <Spinner className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1.5" />
              )}
              TXT
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportPreview('docx')}
              disabled={isGeneratingPreview}
            >
              {isGeneratingPreview ? (
                <Spinner className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1.5" />
              )}
              Word
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportPreview('pdf')}
              disabled={isGeneratingPreview}
            >
              {isGeneratingPreview ? (
                <Spinner className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1.5" />
              )}
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Speakers sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r bg-card p-4 overflow-auto">
          <h2 className="text-sm font-semibold mb-3">Speakers</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Click name to rename
          </p>
          <div className="space-y-2">
            {speakers.map((speaker) => (
              <div
                key={speaker.id}
                className="group flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => startEditingSpeaker(speaker)}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: speaker.color }}
                />
                {editingSpeakerId === speaker.id ? (
                  <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editingSpeakerLabel}
                      onChange={(e) => setEditingSpeakerLabel(e.target.value)}
                      className="h-7 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveSpeakerEdit();
                        if (e.key === 'Escape') cancelSpeakerEdit();
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={saveSpeakerEdit}
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={cancelSpeakerEdit}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm truncate">{speaker.label}</span>
                    <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50" />
                  </>
                )}
              </div>
            ))}

            {/* Add New Speaker */}
            {isAddingSpeaker ? (
              <div className="flex items-center gap-1 p-2">
                <Input
                  value={newSpeakerName}
                  onChange={(e) => setNewSpeakerName(e.target.value)}
                  placeholder={getDefaultSpeakerLabel(speakers.length)}
                  className="h-7 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSpeakerFromSidebar();
                    if (e.key === 'Escape') {
                      setIsAddingSpeaker(false);
                      setNewSpeakerName('');
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleAddSpeakerFromSidebar}
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => {
                    setIsAddingSpeaker(false);
                    setNewSpeakerName('');
                  }}
                >
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <button
                className="flex items-center gap-2 p-2 w-full text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                onClick={() => setIsAddingSpeaker(true)}
              >
                <Plus className="h-4 w-4" />
                Add Speaker
              </button>
            )}
          </div>
        </div>

        {/* Transcript */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search bar */}
          <div className="border-b bg-card px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transcript..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {currentSearchIndex + 1} of {searchResults.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToSearchResult('prev')}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToSearchResult('next')}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {/* Undo button */}
              {editHistory.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={undoLastEdit}
                  title={`Undo: ${editHistory[editHistory.length - 1]?.description}`}
                >
                  <ArrowCounterClockwise className="h-4 w-4 mr-1.5" />
                  Undo
                </Button>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-muted/30 px-4 py-2 text-xs text-muted-foreground border-b flex items-center justify-between">
            <span>Tip: Select text to edit phrase or change speaker attribution</span>
            {editHistory.length > 0 && (
              <span className="text-xs">
                {editHistory.length} edit{editHistory.length !== 1 ? 's' : ''} can be undone
              </span>
            )}
          </div>

          {/* Transcript content */}
          <div ref={transcriptContainerRef} className="flex-1 overflow-auto p-4 space-y-3">
            {segments.map((segment, index) => {
              const isCurrentSegment = index === currentSegmentIndex;
              const progress = isCurrentSegment ? getSegmentProgress(segment) : 0;
              const speaker = getSpeaker(segment.speakerId);

              return (
                <div
                  key={segment.id}
                  ref={(el) => {
                    if (el) segmentRefs.current.set(segment.id, el);
                  }}
                  data-segment-id={segment.id}
                  data-segment-index={index}
                  className={`group relative flex gap-4 p-3 rounded-lg transition-all duration-200 cursor-pointer ${
                    isCurrentSegment
                      ? 'bg-primary/10 border-2 border-primary/30 shadow-sm'
                      : 'hover:bg-muted/50 border border-transparent'
                  } ${
                    searchResults.includes(index) && index === searchResults[currentSearchIndex]
                      ? 'ring-2 ring-yellow-400'
                      : ''
                  }`}
                  onClick={() => {
                    // Only play if user is not selecting text
                    const selection = window.getSelection();
                    if (selection && selection.toString().length > 0) {
                      return; // User is selecting text, don't play
                    }
                    goToSegment(segment);
                  }}
                >
                  {/* Timestamp */}
                  <div className="relative flex-shrink-0 text-xs text-muted-foreground font-mono pt-1 w-12">
                    {formatTime(segment.startTime)}
                  </div>

                  {/* Content */}
                  <div className="relative flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          isCurrentSegment ? 'ring-2 ring-white shadow-sm' : ''
                        }`}
                        style={{ backgroundColor: getSpeakerColor(segment.speakerId) }}
                      />
                      <button
                        className="text-sm font-bold hover:underline focus:outline-none"
                        onClick={(e) => speaker && handleSpeakerNameClick(e, speaker)}
                        title="Click to rename speaker"
                      >
                        {getSpeakerLabel(segment.speakerId)}
                      </button>
                      {segment.isEdited && (
                        <Badge variant="outline" className="text-xs">
                          Edited
                        </Badge>
                      )}
                      {isCurrentSegment && isPlaying && (
                        <Badge className="text-xs bg-primary/20 text-primary border-0">
                          Playing
                        </Badge>
                      )}
                    </div>

                    {editingSegmentId === segment.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full p-2 text-sm border rounded-md min-h-[80px] resize-none"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveSegmentEdit}>
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button variant="outline" size="sm" onClick={cancelSegmentEdit}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p
                        className={`text-sm leading-relaxed select-text ${isCurrentSegment ? 'text-foreground' : 'text-foreground/80'}`}
                        data-segment-id={segment.id}
                        data-segment-index={index}
                      >
                        {isCurrentSegment
                          ? renderTextWithProgress(segment.text, progress, isPlaying)
                          : highlightText(segment.text)}
                      </p>
                    )}
                  </div>

                  {/* Edit button */}
                  {editingSegmentId !== segment.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="relative opacity-0 group-hover:opacity-100 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditingSegment(segment);
                      }}
                      title="Edit entire segment"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Text Selection Popup */}
      {textSelection && (
        <div
          ref={selectionPopupRef}
          className="fixed z-50 bg-card border rounded-lg shadow-lg p-1 flex gap-1"
          style={{
            left: textSelection.rect.left + textSelection.rect.width / 2 - 100,
            top: textSelection.rect.bottom + 8,
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEditPhrase}
            className="flex items-center gap-1.5"
          >
            <TextAa className="h-4 w-4" />
            Edit Phrase
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEditSpeaker}
            className="flex items-center gap-1.5"
          >
            <UserSwitch className="h-4 w-4" />
            Edit Speaker
          </Button>
        </div>
      )}

      {/* Edit Phrase Modal */}
      {editPhraseState && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Phrase</h3>
            <p className="text-sm text-muted-foreground mb-2">Original:</p>
            <p className="text-sm bg-muted/50 p-2 rounded mb-4 italic">
              &quot;{editPhraseState.selectedText}&quot;
            </p>
            <p className="text-sm text-muted-foreground mb-2">New text:</p>
            <textarea
              value={editPhraseState.newText}
              onChange={(e) => setEditPhraseState({ ...editPhraseState, newText: e.target.value })}
              className="w-full p-3 text-sm border rounded-md min-h-[100px] resize-none mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditPhraseState(null)}>
                Cancel
              </Button>
              <Button onClick={saveEditedPhrase}>
                <Check className="h-4 w-4 mr-1.5" />
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Speaker Modal */}
      {editSpeakerState && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Change Speaker</h3>
            <p className="text-sm text-muted-foreground mb-2">Selected text:</p>
            <p className="text-sm bg-muted/50 p-2 rounded mb-4 italic">
              &quot;{editSpeakerState.selectedText}&quot;
            </p>
            <p className="text-sm text-muted-foreground mb-2">Assign to speaker:</p>
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {speakers.map((speaker) => (
                <button
                  key={speaker.id}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    editSpeakerState.newSpeakerId === speaker.id && !editSpeakerState.isCreatingNewSpeaker
                      ? 'border-primary bg-primary/10'
                      : 'border-muted hover:bg-muted/50'
                  }`}
                  onClick={() => setEditSpeakerState({
                    ...editSpeakerState,
                    newSpeakerId: speaker.id,
                    isCreatingNewSpeaker: false,
                    newSpeakerName: '',
                  })}
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: speaker.color }}
                  />
                  <span className="text-sm font-medium">{speaker.label}</span>
                  {editSpeakerState.newSpeakerId === speaker.id && !editSpeakerState.isCreatingNewSpeaker && (
                    <Check className="h-4 w-4 ml-auto text-primary" />
                  )}
                </button>
              ))}

              {/* Create New Speaker option */}
              <button
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  editSpeakerState.isCreatingNewSpeaker
                    ? 'border-primary bg-primary/10'
                    : 'border-dashed border-muted hover:bg-muted/50'
                }`}
                onClick={() => setEditSpeakerState({
                  ...editSpeakerState,
                  isCreatingNewSpeaker: true,
                  newSpeakerName: editSpeakerState.newSpeakerName || getDefaultSpeakerLabel(speakers.length),
                })}
              >
                <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                  <UserPlus className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Create New Speaker</span>
                {editSpeakerState.isCreatingNewSpeaker && (
                  <Check className="h-4 w-4 ml-auto text-primary" />
                )}
              </button>
            </div>

            {/* New speaker name input */}
            {editSpeakerState.isCreatingNewSpeaker && (
              <div className="mb-4">
                <label className="text-sm text-muted-foreground mb-2 block">New speaker name:</label>
                <Input
                  value={editSpeakerState.newSpeakerName || ''}
                  onChange={(e) => setEditSpeakerState({
                    ...editSpeakerState,
                    newSpeakerName: e.target.value,
                  })}
                  placeholder={getDefaultSpeakerLabel(speakers.length)}
                  autoFocus
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditSpeakerState(null)}>
                Cancel
              </Button>
              <Button
                onClick={saveSpeakerChange}
                disabled={editSpeakerState.isCreatingNewSpeaker && !editSpeakerState.newSpeakerName?.trim()}
              >
                <Check className="h-4 w-4 mr-1.5" />
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Export Preview Modal */}
      {exportPreview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">
                  {exportPreview.format === 'pdf' && 'PDF Preview'}
                  {exportPreview.format === 'docx' && 'Word Document Preview'}
                  {exportPreview.format === 'txt' && 'Text File Preview'}
                </h3>
                <p className="text-sm text-muted-foreground">{exportPreview.fileName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleExportDownload}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Export {exportPreview.format.toUpperCase()}
                </Button>
                <Button variant="ghost" size="sm" onClick={closeExportPreview}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-hidden p-4 bg-muted/30">
              {exportPreview.format === 'pdf' && (
                <iframe
                  src={exportPreview.blobUrl}
                  className="w-full h-full rounded-lg border bg-white"
                  title="PDF Preview"
                />
              )}
              {exportPreview.format === 'txt' && exportPreview.content && (
                <div className="w-full h-full overflow-auto rounded-lg border bg-white p-6">
                  <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                    {exportPreview.content}
                  </pre>
                </div>
              )}
              {exportPreview.format === 'docx' && exportPreview.htmlPreview && (
                <div className="w-full h-full overflow-auto rounded-lg border bg-white">
                  <div dangerouslySetInnerHTML={{ __html: exportPreview.htmlPreview }} />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t">
              <Button variant="outline" onClick={closeExportPreview}>
                Cancel
              </Button>
              <Button onClick={handleExportDownload}>
                <Download className="h-4 w-4 mr-1.5" />
                Export {exportPreview.format.toUpperCase()}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Audio player */}
      {audioUrl && (
        <div className="border-t bg-card px-4 py-3 md:px-6">
          <audio ref={audioRef} src={audioUrl} preload="metadata" />

          <div className="flex items-center gap-4">
            {/* Controls */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={skipBack}>
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-10 w-10 rounded-full p-0"
                onClick={togglePlayPause}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" weight="fill" />
                ) : (
                  <Play className="h-5 w-5" weight="fill" />
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={skipForward}>
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>

            {/* Progress */}
            <div className="flex-1 flex items-center gap-3">
              <span className="text-sm text-muted-foreground font-mono w-12">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 relative">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => seek(parseFloat(e.target.value))}
                  className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                />
              </div>
              <span className="text-sm text-muted-foreground font-mono w-12">
                {formatTime(duration)}
              </span>
            </div>

            {/* Volume */}
            <Button variant="ghost" size="sm" onClick={toggleMute}>
              {isMuted ? (
                <SpeakerSlash className="h-5 w-5" />
              ) : (
                <SpeakerHigh className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
