/**
 * Export Utilities for Court Transcripts
 *
 * Supports exporting transcripts to:
 * - Plain Text (.txt)
 * - Microsoft Word (.docx)
 * - PDF (.pdf)
 *
 * Formatting matches the UI styling with proper margins and typography.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  TableOfContents,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
} from 'docx';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import type { Recording, TranscriptSegment, Speaker, ExportOptions } from '@/types/recording';

// Legal document formatting values per style guide
const MARGIN_TOP = 1; // 1 inch
const MARGIN_BOTTOM = 1; // 1 inch
const MARGIN_LEFT = 1.25; // 1.25 inches
const MARGIN_RIGHT = 1; // 1 inch
const FONT_SIZE_TITLE = 12;
const FONT_SIZE_BODY = 12;
const FONT_SIZE_TIMESTAMP = 10;
const FONT_SIZE_FOOTER = 9;
const LINE_SPACING = 1.15; // Single or 1.15 per style guide
const FONT_FAMILY = 'Times New Roman';

// Case.dev branding
const CASE_DEV_HEADER = 'Transcription provided by case.dev';

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${mins}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

function getSpeakerLabel(speakerId: string, speakers: Speaker[]): string {
  const speaker = speakers.find((s) => s.id === speakerId);
  return speaker?.label || speakerId;
}

function getSpeakerColor(speakerId: string, speakers: Speaker[]): string {
  const speaker = speakers.find((s) => s.id === speakerId);
  return speaker?.color || '#374151';
}

// =============================================================================
// Plain Text Export - Legal Transcription Style
// =============================================================================

function exportToText(
  recording: Recording,
  segments: TranscriptSegment[],
  speakers: Speaker[],
  options: ExportOptions
): string {
  const divider = '─'.repeat(72);
  let content = '';

  // Header - Left: case.dev, Right: Date
  content += `${CASE_DEV_HEADER.padEnd(50)}${formatDate(recording.uploadedAt)}\n`;
  content += `${divider}\n\n`;

  // Title
  content += `${recording.name} Transcription\n`;
  content += `${recording.fileName}\n`;
  content += `Duration: ${formatDuration(recording.duration)}\n\n`;

  // Speakers List
  content += `SPEAKERS:\n`;
  speakers.forEach((speaker, index) => {
    content += `${index + 1}. ${speaker.label}\n`;
  });
  content += `\n${divider}\n\n`;

  // Transcript Content - Timestamp and speaker as header above text
  segments.forEach((segment) => {
    const speakerLabel = getSpeakerLabel(segment.speakerId, speakers);

    // Header line with timestamp and speaker
    let header = '';
    if (options.includeTimestamps) {
      header += `[${formatTime(segment.startTime)}] `;
    }
    if (options.includeSpeakerLabels) {
      header += speakerLabel.toUpperCase();
    }

    if (header) {
      content += `${header}\n`;
    }

    // Text on its own line below
    content += `${segment.text}\n\n`;
  });

  // End of Recording marker per style guide
  content += `[END OF RECORDING]\n\n`;
  content += `${divider}\n`;

  // Footer - Left: case.dev, Right: Generated date
  content += `${CASE_DEV_HEADER.padEnd(50)}Generated: ${new Date().toLocaleDateString()}\n`;

  return content;
}

// =============================================================================
// Word Document Export - Legal Transcription Style
// =============================================================================

async function exportToWord(
  recording: Recording,
  segments: TranscriptSegment[],
  speakers: Speaker[],
  options: ExportOptions
): Promise<Blob> {
  const children: Paragraph[] = [];
  // Line spacing: 1.15 = 276 twips (240 * 1.15)
  const lineSpacing = Math.round(240 * LINE_SPACING);

  // Header Row - Left: case.dev, Right: Date (using tabs)
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: CASE_DEV_HEADER,
          italics: true,
          size: FONT_SIZE_FOOTER * 2,
          font: FONT_FAMILY,
          color: '666666',
        }),
        new TextRun({
          text: '\t',
          font: FONT_FAMILY,
        }),
        new TextRun({
          text: formatDate(recording.uploadedAt),
          italics: true,
          size: FONT_SIZE_FOOTER * 2,
          font: FONT_FAMILY,
          color: '666666',
        }),
      ],
      tabStops: [
        {
          type: 'right' as const,
          position: convertInchesToTwip(6.25), // Right margin position
        },
      ],
      spacing: { after: 300 },
      border: {
        bottom: {
          color: 'CCCCCC',
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
    })
  );

  // Document Title - centered
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${recording.name} Transcription`,
          bold: true,
          size: FONT_SIZE_TITLE * 2,
          font: FONT_FAMILY,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 120 },
    })
  );

  // Original File Name (subtitle) - centered
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: recording.fileName,
          size: FONT_SIZE_BODY * 2,
          font: FONT_FAMILY,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    })
  );

  // Duration - centered
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Duration: ${formatDuration(recording.duration)}`,
          size: FONT_SIZE_BODY * 2,
          font: FONT_FAMILY,
          color: '666666',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  // Speakers Section Header
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'SPEAKERS',
          bold: true,
          size: FONT_SIZE_BODY * 2,
          font: FONT_FAMILY,
        }),
      ],
      spacing: { after: 120 },
    })
  );

  // Speakers List
  speakers.forEach((speaker, index) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${index + 1}. ${speaker.label}`,
            size: FONT_SIZE_BODY * 2,
            font: FONT_FAMILY,
          }),
        ],
        spacing: { after: 60 },
      })
    );
  });

  // Divider before transcript
  children.push(
    new Paragraph({
      children: [],
      spacing: { before: 200, after: 200 },
      border: {
        bottom: {
          color: 'CCCCCC',
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
    })
  );

  // Transcript Content - Timestamp and speaker as header above text
  segments.forEach((segment) => {
    const speakerLabel = getSpeakerLabel(segment.speakerId, speakers);

    // Header line with timestamp and speaker
    const headerRuns: TextRun[] = [];
    if (options.includeTimestamps) {
      headerRuns.push(
        new TextRun({
          text: `[${formatTime(segment.startTime)}] `,
          size: FONT_SIZE_BODY * 2,
          font: FONT_FAMILY,
          color: '666666',
        })
      );
    }
    if (options.includeSpeakerLabels) {
      headerRuns.push(
        new TextRun({
          text: speakerLabel.toUpperCase(),
          bold: true,
          size: FONT_SIZE_BODY * 2,
          font: FONT_FAMILY,
        })
      );
    }

    // Add header paragraph if there's content
    if (headerRuns.length > 0) {
      children.push(
        new Paragraph({
          children: headerRuns,
          spacing: { after: 60, line: lineSpacing },
        })
      );
    }

    // Text paragraph below header
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: segment.text,
            size: FONT_SIZE_BODY * 2,
            font: FONT_FAMILY,
          }),
        ],
        spacing: { after: 200, line: lineSpacing },
      })
    );
  });

  // End of Recording marker
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '[END OF RECORDING]',
          bold: true,
          size: FONT_SIZE_BODY * 2,
          font: FONT_FAMILY,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 300 },
    })
  );

  // Footer divider
  children.push(
    new Paragraph({
      children: [],
      spacing: { after: 200 },
      border: {
        bottom: {
          color: 'CCCCCC',
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
    })
  );

  // Footer Row - Left: case.dev, Right: Generated date
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: CASE_DEV_HEADER,
          italics: true,
          size: FONT_SIZE_FOOTER * 2,
          font: FONT_FAMILY,
          color: '666666',
        }),
        new TextRun({
          text: '\t',
          font: FONT_FAMILY,
        }),
        new TextRun({
          text: `Generated: ${new Date().toLocaleDateString()}`,
          italics: true,
          size: FONT_SIZE_FOOTER * 2,
          font: FONT_FAMILY,
          color: '666666',
        }),
      ],
      tabStops: [
        {
          type: 'right' as const,
          position: convertInchesToTwip(6.25),
        },
      ],
    })
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_FAMILY,
            size: FONT_SIZE_BODY * 2,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(MARGIN_TOP),
              bottom: convertInchesToTwip(MARGIN_BOTTOM),
              left: convertInchesToTwip(MARGIN_LEFT),
              right: convertInchesToTwip(MARGIN_RIGHT),
            },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

// =============================================================================
// PDF Export - Legal Transcription Style per Style Guide
// =============================================================================

async function exportToPdf(
  recording: Recording,
  segments: TranscriptSegment[],
  speakers: Speaker[],
  options: ExportOptions
): Promise<Blob> {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Margins per style guide: Top 1", Bottom 1", Left 1.25", Right 1"
  const marginTop = MARGIN_TOP * 72; // 72 points per inch
  const marginBottom = MARGIN_BOTTOM * 72;
  const marginLeft = MARGIN_LEFT * 72;
  const marginRight = MARGIN_RIGHT * 72;
  const maxWidth = pageWidth - marginLeft - marginRight;
  let y = marginTop;

  const colors = {
    title: '#000000',
    heading: '#000000',
    body: '#000000',
    muted: '#666666',
    light: '#999999',
    border: '#CCCCCC',
  };

  // Line spacing: 1.15 = ~16.5pt for 12pt font
  const lineHeight = Math.round(FONT_SIZE_BODY * LINE_SPACING * 1.2);

  // Helper to add page break if needed
  const checkPageBreak = (height: number): boolean => {
    if (y + height > pageHeight - marginBottom - 30) {
      doc.addPage();
      y = marginTop;
      return true;
    }
    return false;
  };

  // Helper to draw horizontal line
  const drawLine = () => {
    doc.setDrawColor(colors.border);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 10;
  };

  // Header Row - Left: case.dev, Right: Date
  doc.setFontSize(FONT_SIZE_FOOTER);
  doc.setFont('times', 'italic');
  doc.setTextColor(colors.muted);
  doc.text(CASE_DEV_HEADER, marginLeft, y);
  doc.text(formatDate(recording.uploadedAt), pageWidth - marginRight, y, { align: 'right' });
  y += 15;
  drawLine();
  y += 20;

  // Title
  doc.setFontSize(FONT_SIZE_TITLE);
  doc.setFont('times', 'bold');
  doc.setTextColor(colors.title);
  doc.text(`${recording.name} Transcription`, pageWidth / 2, y, { align: 'center' });
  y += 20;

  // Original File Name (subtitle)
  doc.setFontSize(FONT_SIZE_BODY);
  doc.setFont('times', 'normal');
  doc.text(recording.fileName, pageWidth / 2, y, { align: 'center' });
  y += 16;

  // Duration
  doc.setTextColor(colors.muted);
  doc.text(`Duration: ${formatDuration(recording.duration)}`, pageWidth / 2, y, { align: 'center' });
  y += 30;

  // Speakers Section Header
  doc.setFont('times', 'bold');
  doc.setTextColor(colors.heading);
  doc.text('SPEAKERS', marginLeft, y);
  y += lineHeight;

  // Speakers List
  doc.setFont('times', 'normal');
  doc.setTextColor(colors.body);
  speakers.forEach((speaker, index) => {
    doc.text(`${index + 1}. ${speaker.label}`, marginLeft, y);
    y += lineHeight * 0.8;
  });

  y += 10;
  drawLine();
  y += 20;

  // Transcript Content - Timestamp and speaker as header above text
  doc.setFontSize(FONT_SIZE_BODY);

  segments.forEach((segment) => {
    const speakerLabel = getSpeakerLabel(segment.speakerId, speakers);

    // Header line with timestamp and speaker
    checkPageBreak(lineHeight * 2);
    let xPos = marginLeft;

    if (options.includeTimestamps) {
      doc.setFont('times', 'normal');
      doc.setTextColor(colors.muted);
      const timestampText = `[${formatTime(segment.startTime)}] `;
      doc.text(timestampText, xPos, y);
      xPos += doc.getTextWidth(timestampText);
    }

    if (options.includeSpeakerLabels) {
      doc.setFont('times', 'bold');
      doc.setTextColor(colors.heading);
      doc.text(speakerLabel.toUpperCase(), xPos, y);
    }

    if (options.includeTimestamps || options.includeSpeakerLabels) {
      y += lineHeight;
    }

    // Text below header
    doc.setFont('times', 'normal');
    doc.setTextColor(colors.body);
    const textLines = doc.splitTextToSize(segment.text, maxWidth);
    textLines.forEach((line: string) => {
      checkPageBreak(lineHeight);
      doc.text(line, marginLeft, y);
      y += lineHeight;
    });

    y += lineHeight * 0.5; // Gap between segments
  });

  // End of Recording marker per style guide
  y += 20;
  checkPageBreak(80);

  doc.setFont('times', 'bold');
  doc.setFontSize(FONT_SIZE_BODY);
  doc.setTextColor(colors.heading);
  doc.text('[END OF RECORDING]', pageWidth / 2, y, { align: 'center' });
  y += 20;
  drawLine();
  y += 15;

  // Footer Row - Left: case.dev, Right: Generated date
  doc.setFont('times', 'italic');
  doc.setFontSize(FONT_SIZE_FOOTER);
  doc.setTextColor(colors.muted);
  doc.text(CASE_DEV_HEADER, marginLeft, y);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - marginRight, y, { align: 'right' });

  // Add page numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('times', 'normal');
    doc.setFontSize(FONT_SIZE_FOOTER);
    doc.setTextColor(colors.light);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - marginBottom + 20, { align: 'center' });
  }

  return doc.output('blob');
}

// =============================================================================
// Main Export Function
// =============================================================================

export async function exportTranscript(
  recording: Recording,
  segments: TranscriptSegment[],
  speakers: Speaker[],
  options: ExportOptions
): Promise<void> {
  const fileName = recording.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = new Date().toISOString().split('T')[0];

  switch (options.format) {
    case 'txt': {
      const content = exportToText(recording, segments, speakers, options);
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `${fileName}_transcript_${timestamp}.txt`);
      break;
    }

    case 'docx': {
      const blob = await exportToWord(recording, segments, speakers, options);
      saveAs(blob, `${fileName}_transcript_${timestamp}.docx`);
      break;
    }

    case 'pdf': {
      const blob = await exportToPdf(recording, segments, speakers, options);
      saveAs(blob, `${fileName}_transcript_${timestamp}.pdf`);
      break;
    }
  }
}

// =============================================================================
// Export Preview Types and Functions
// =============================================================================

export interface ExportPreviewData {
  blobUrl: string;
  blob: Blob;
  fileName: string;
  format: 'txt' | 'docx' | 'pdf';
  content?: string; // For TXT preview
  htmlPreview?: string; // For DOCX preview (HTML representation)
}

// Legacy alias for backward compatibility
export type PdfPreviewData = ExportPreviewData;

/**
 * Generate HTML preview for DOCX (mirrors the Word document structure)
 */
function generateDocxHtmlPreview(
  recording: Recording,
  segments: TranscriptSegment[],
  speakers: Speaker[],
  options: ExportOptions
): string {
  let html = `
    <div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.15; max-width: 6.5in; margin: 0 auto; padding: 1in 1in 1in 1.25in; background: white; min-height: 11in;">
      <!-- Header Row -->
      <div style="display: flex; justify-content: space-between; font-size: 9pt; font-style: italic; color: #666; padding-bottom: 10px; border-bottom: 1px solid #ccc; margin-bottom: 20px;">
        <span>${CASE_DEV_HEADER}</span>
        <span>${formatDate(recording.uploadedAt)}</span>
      </div>

      <!-- Title -->
      <h1 style="text-align: center; font-size: 12pt; font-weight: bold; margin: 20px 0 10px 0;">${recording.name} Transcription</h1>
      <p style="text-align: center; margin: 0 0 10px 0;">${recording.fileName}</p>
      <p style="text-align: center; color: #666; margin: 0 0 30px 0;">Duration: ${formatDuration(recording.duration)}</p>

      <!-- Speakers -->
      <p style="font-weight: bold; margin: 0 0 10px 0;">SPEAKERS</p>
      <div style="margin-bottom: 20px;">
        ${speakers.map((speaker, index) => `<p style="margin: 5px 0;">${index + 1}. ${speaker.label}</p>`).join('')}
      </div>

      <hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;" />

      <!-- Transcript Content -->
      <div style="margin-top: 20px;">
  `;

  segments.forEach((segment) => {
    const speakerLabel = getSpeakerLabel(segment.speakerId, speakers);

    // Header with timestamp and speaker
    let header = '';
    if (options.includeTimestamps) {
      header += `<span style="color: #666;">[${formatTime(segment.startTime)}]</span> `;
    }
    if (options.includeSpeakerLabels) {
      header += `<strong>${speakerLabel.toUpperCase()}</strong>`;
    }

    if (header) {
      html += `<p style="margin: 0 0 4px 0;">${header}</p>`;
    }

    // Text below header
    html += `<p style="margin: 0 0 15px 0;">${segment.text}</p>`;
  });

  html += `
      </div>

      <!-- End of Recording -->
      <p style="text-align: center; font-weight: bold; margin: 30px 0 20px 0;">[END OF RECORDING]</p>

      <hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;" />

      <!-- Footer Row -->
      <div style="display: flex; justify-content: space-between; font-size: 9pt; font-style: italic; color: #666;">
        <span>${CASE_DEV_HEADER}</span>
        <span>Generated: ${new Date().toLocaleDateString()}</span>
      </div>
    </div>
  `;

  return html;
}

/**
 * Generate a preview for any export format
 */
export async function generateExportPreview(
  recording: Recording,
  segments: TranscriptSegment[],
  speakers: Speaker[],
  options: ExportOptions
): Promise<ExportPreviewData> {
  const fileName = recording.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = new Date().toISOString().split('T')[0];

  switch (options.format) {
    case 'txt': {
      const content = exportToText(recording, segments, speakers, options);
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      return {
        blobUrl,
        blob,
        fileName: `${fileName}_transcript_${timestamp}.txt`,
        format: 'txt',
        content,
      };
    }

    case 'docx': {
      const blob = await exportToWord(recording, segments, speakers, options);
      const blobUrl = URL.createObjectURL(blob);
      const htmlPreview = generateDocxHtmlPreview(recording, segments, speakers, options);
      return {
        blobUrl,
        blob,
        fileName: `${fileName}_transcript_${timestamp}.docx`,
        format: 'docx',
        htmlPreview,
      };
    }

    case 'pdf': {
      const blob = await exportToPdf(recording, segments, speakers, options);
      const blobUrl = URL.createObjectURL(blob);
      return {
        blobUrl,
        blob,
        fileName: `${fileName}_transcript_${timestamp}.pdf`,
        format: 'pdf',
      };
    }
  }
}

/**
 * Download from preview data
 */
export function downloadFromPreview(previewData: ExportPreviewData): void {
  saveAs(previewData.blob, previewData.fileName);
}

/**
 * Revoke the blob URL to free memory
 */
export function revokePreview(previewData: ExportPreviewData): void {
  URL.revokeObjectURL(previewData.blobUrl);
}

// Legacy PDF-specific functions for backward compatibility
export async function generatePdfPreview(
  recording: Recording,
  segments: TranscriptSegment[],
  speakers: Speaker[],
  options: Omit<ExportOptions, 'format'>
): Promise<ExportPreviewData> {
  return generateExportPreview(recording, segments, speakers, { ...options, format: 'pdf' });
}

export function downloadPdfFromPreview(previewData: ExportPreviewData): void {
  downloadFromPreview(previewData);
}

export function revokePdfPreview(previewData: ExportPreviewData): void {
  revokePreview(previewData);
}
