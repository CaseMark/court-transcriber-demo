/**
 * Case.dev HTTP Client
 *
 * Provides direct HTTP access to Case.dev APIs for:
 * - Voice transcription with speaker diarization
 * - OCR document processing
 * - LLM operations for transcript cleanup
 */

const CASE_DEV_API_URL = 'https://api.case.dev';

// Get API key from environment
function getApiKey(): string {
  const apiKey = process.env.CASE_API_KEY;
  if (!apiKey) {
    throw new Error('CASE_API_KEY environment variable is not set');
  }
  return apiKey;
}

// =============================================================================
// Voice Transcription
// =============================================================================

export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: string;
}

export interface TranscriptionSegment {
  id: string;
  speaker: string;
  text: string;
  start: number;
  end: number;
  words: TranscriptionWord[];
  confidence: number;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  speakers: string[];
  duration: number;
  language: string;
}

export interface TranscribeOptions {
  speakerLabels?: boolean;
  speakersExpected?: number;
  language?: string;
  vocabularyBoost?: string[];
}

export interface TranscriptionJobResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  vault_id?: string;
  source_object_id?: string;
  error?: string;
}

export interface TranscriptionStatusResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
    speaker?: string;
  }>;
  utterances?: Array<{
    speaker: string;
    text: string;
    start: number;
    end: number;
    confidence: number;
    words: Array<{
      text: string;
      start: number;
      end: number;
      confidence: number;
    }>;
  }>;
  audio_duration?: number;
  error?: string;
}

/**
 * Create a transcription job with an audio URL
 */
export async function createTranscriptionJob(
  audioUrl: string,
  options: TranscribeOptions = {}
): Promise<TranscriptionJobResponse> {
  const apiKey = getApiKey();

  const response = await fetch(`${CASE_DEV_API_URL}/voice/transcription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: options.speakerLabels ?? true,
      speakers_expected: options.speakersExpected,
      language_code: options.language || 'en_us',
      punctuate: true,
      format_text: true,
      word_boost: options.vocabularyBoost,
      boost_param: options.vocabularyBoost?.length ? 'high' : undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create transcription job: ${error}`);
  }

  return await response.json();
}

/**
 * Get transcription job status and results
 */
export async function getTranscriptionStatus(
  jobId: string
): Promise<TranscriptionStatusResponse> {
  const apiKey = getApiKey();

  const response = await fetch(
    `${CASE_DEV_API_URL}/voice/transcription/${jobId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get transcription status: ${error}`);
  }

  return await response.json();
}

/**
 * Poll for transcription completion with timeout
 */
export async function waitForTranscription(
  jobId: string,
  maxWaitMs: number = 300000, // 5 minutes max
  pollIntervalMs: number = 2000
): Promise<TranscriptionStatusResponse> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getTranscriptionStatus(jobId);

    if (status.status === 'completed') {
      return status;
    }

    if (status.status === 'error') {
      throw new Error(`Transcription failed: ${status.error || 'Unknown error'}`);
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error('Transcription timed out');
}

/**
 * Transcribe an audio file from URL with speaker diarization
 * Handles job creation and polling for results
 */
export async function transcribeAudioUrl(
  audioUrl: string,
  options: TranscribeOptions = {}
): Promise<TranscriptionResult> {
  // Create the transcription job
  const job = await createTranscriptionJob(audioUrl, options);
  console.log(`[Case.dev] Transcription job created: ${job.id}`);

  // Wait for completion
  const result = await waitForTranscription(job.id);
  console.log(`[Case.dev] Transcription completed for job: ${job.id}`);

  return parseTranscriptionResponse(result);
}

/**
 * Transcribe an audio file directly via file upload
 * This is the preferred method - no external blob storage required
 */
export async function transcribeAudioFile(
  audioFile: File | Blob,
  options: TranscribeOptions = {}
): Promise<TranscriptionResult> {
  const apiKey = getApiKey();

  // Build form data for direct file upload
  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('speaker_labels', String(options.speakerLabels ?? true));
  formData.append('language_code', options.language || 'en_us');
  formData.append('punctuate', 'true');
  formData.append('format_text', 'true');

  if (options.speakersExpected) {
    formData.append('speakers_expected', String(options.speakersExpected));
  }

  if (options.vocabularyBoost?.length) {
    formData.append('word_boost', JSON.stringify(options.vocabularyBoost));
    formData.append('boost_param', 'high');
  }

  console.log('[Case.dev] Uploading audio file for transcription...');

  const response = await fetch(`${CASE_DEV_API_URL}/voice/transcription`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create transcription job: ${error}`);
  }

  const job: TranscriptionJobResponse = await response.json();
  console.log(`[Case.dev] Transcription job created: ${job.id}`);

  // Wait for completion
  const result = await waitForTranscription(job.id);
  console.log(`[Case.dev] Transcription completed for job: ${job.id}`);

  return parseTranscriptionResponse(result);
}

/**
 * Parse transcription response into standardized result format
 */
function parseTranscriptionResponse(
  result: TranscriptionStatusResponse
): TranscriptionResult {
  // Extract unique speakers from utterances
  const speakersSet = new Set<string>();
  const segments: TranscriptionSegment[] = [];

  if (result.utterances) {
    result.utterances.forEach((utterance, index) => {
      speakersSet.add(utterance.speaker);
      segments.push({
        id: `seg-${index}`,
        speaker: utterance.speaker,
        text: utterance.text,
        start: utterance.start,
        end: utterance.end,
        words: utterance.words.map((w) => ({
          word: w.text,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
          speaker: utterance.speaker,
        })),
        confidence: utterance.confidence,
      });
    });
  }

  return {
    text: result.text || '',
    segments,
    speakers: Array.from(speakersSet),
    duration: result.audio_duration || 0,
    language: 'en',
  };
}

// =============================================================================
// LLM Operations
// =============================================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Chat completion for transcript cleanup and enhancement
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch(`${CASE_DEV_API_URL}/llm/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || 'anthropic/claude-3-5-sonnet-20241022',
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chat completion failed: ${error}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || '';
}

/**
 * Clean up and enhance transcript text
 */
export async function cleanupTranscript(
  rawText: string,
  context?: string
): Promise<string> {
  const systemPrompt = `You are a legal transcription specialist. Clean up and enhance the following court transcript:

1. Fix obvious transcription errors
2. Add proper punctuation and capitalization
3. Preserve legal terminology exactly
4. Maintain speaker attributions
5. Do not change the meaning or content
${context ? `\nContext: ${context}` : ''}

Return only the cleaned transcript, no explanations.`;

  const result = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: rawText },
  ]);

  return result;
}

/**
 * Identify and label speakers based on context
 */
export async function identifySpeakers(
  transcript: string,
  speakerCount: number
): Promise<Record<string, string>> {
  const systemPrompt = `Analyze this court transcript and identify the likely role of each speaker.

Common roles include:
- Judge
- Plaintiff's Attorney
- Defense Attorney
- Witness
- Defendant
- Court Reporter
- Bailiff
- Clerk

Based on the content, suggest appropriate labels for each speaker.
Return a JSON object mapping speaker IDs to suggested labels.
Example: {"Speaker 1": "Judge", "Speaker 2": "Defense Attorney"}`;

  const result = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Transcript with ${speakerCount} speakers:\n\n${transcript}`,
      },
    ],
    { temperature: 0.1 }
  );

  try {
    // Try to parse JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    console.warn('Failed to parse speaker identification result');
  }

  return {};
}

// =============================================================================
// OCR Operations
// =============================================================================

export interface OcrPage {
  pageNumber: number;
  text: string;
  confidence: number;
  width: number;
  height: number;
  words?: Array<{
    text: string;
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
}

export interface OcrResult {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  pages?: OcrPage[];
  pageCount?: number;
  error?: string;
}

export interface OcrOptions {
  language?: string;
  outputFormat?: 'text' | 'json' | 'markdown';
  includeConfidence?: boolean;
  includeBoundingBoxes?: boolean;
}

/**
 * Create an OCR job with a file URL
 */
export async function createOcrJob(
  fileUrl: string,
  options: OcrOptions = {}
): Promise<{ id: string; status: string }> {
  const apiKey = getApiKey();

  const response = await fetch(`${CASE_DEV_API_URL}/ocr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      file_url: fileUrl,
      language: options.language || 'en',
      output_format: options.outputFormat || 'text',
      include_confidence: options.includeConfidence ?? false,
      include_bounding_boxes: options.includeBoundingBoxes ?? false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create OCR job: ${error}`);
  }

  return await response.json();
}

/**
 * Get OCR job status and results
 */
export async function getOcrStatus(jobId: string): Promise<OcrResult> {
  const apiKey = getApiKey();

  const response = await fetch(`${CASE_DEV_API_URL}/ocr/${jobId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get OCR status: ${error}`);
  }

  return await response.json();
}

/**
 * Poll for OCR completion with timeout
 */
export async function waitForOcr(
  jobId: string,
  maxWaitMs: number = 300000, // 5 minutes max
  pollIntervalMs: number = 2000
): Promise<OcrResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getOcrStatus(jobId);

    if (status.status === 'completed') {
      return status;
    }

    if (status.status === 'error') {
      throw new Error(`OCR failed: ${status.error || 'Unknown error'}`);
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error('OCR timed out');
}

/**
 * Process a document via OCR from URL
 * Handles job creation and polling for results
 */
export async function ocrFromUrl(
  fileUrl: string,
  options: OcrOptions = {}
): Promise<OcrResult> {
  // Create the OCR job
  const job = await createOcrJob(fileUrl, options);
  console.log(`[Case.dev] OCR job created: ${job.id}`);

  // Wait for completion
  const result = await waitForOcr(job.id);
  console.log(`[Case.dev] OCR completed for job: ${job.id}`);

  return result;
}
