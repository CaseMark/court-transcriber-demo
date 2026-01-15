/**
 * Legal Vocabulary for Court Transcription
 *
 * These terms are used to boost transcription accuracy
 * for court-specific terminology.
 */

export const LEGAL_VOCABULARY = [
  // Court Roles
  'plaintiff',
  'defendant',
  'petitioner',
  'respondent',
  'appellant',
  'appellee',
  'counsel',
  'attorney',
  'bailiff',
  'stenographer',
  'court reporter',

  // Proceedings
  'arraignment',
  'deposition',
  'voir dire',
  'cross-examination',
  'direct examination',
  're-direct',
  're-cross',
  'sidebar',
  'en banc',
  'in camera',
  'pro se',
  'pro bono',

  // Legal Terms
  'habeas corpus',
  'certiorari',
  'mandamus',
  'subpoena',
  'duces tecum',
  'prima facie',
  'res judicata',
  'stare decisis',
  'amicus curiae',
  'nolo contendere',
  'mens rea',
  'actus reus',
  'beyond reasonable doubt',
  'preponderance of evidence',
  'clear and convincing',

  // Objections
  'objection',
  'sustained',
  'overruled',
  'hearsay',
  'leading',
  'relevance',
  'prejudicial',
  'speculation',
  'foundation',
  'argumentative',
  'asked and answered',
  'compound question',
  'calls for narrative',

  // Evidence
  'exhibit',
  'stipulation',
  'admissible',
  'inadmissible',
  'probative',
  'circumstantial',
  'corroborating',
  'impeachment',
  'authentication',

  // Motions
  'motion',
  'motion in limine',
  'motion to dismiss',
  'motion for summary judgment',
  'motion to suppress',
  'motion for continuance',
  'motion for mistrial',

  // Verdicts & Judgments
  'verdict',
  'judgment',
  'acquittal',
  'conviction',
  'sentencing',
  'restitution',
  'probation',
  'parole',
  'injunction',
  'restraining order',

  // Procedural
  'jurisdiction',
  'venue',
  'standing',
  'statute of limitations',
  'discovery',
  'interrogatories',
  'affidavit',
  'declaration',
  'testimony',

  // Common Phrases
  'Your Honor',
  'the court',
  'counsel for',
  'ladies and gentlemen of the jury',
  'so ordered',
  'let the record reflect',
  'off the record',
  'on the record',
  'strike from the record',
  'the witness may step down',
  'you may proceed',
  'please state your name for the record',
];

/**
 * Get vocabulary terms for transcription boost
 */
export function getLegalVocabulary(): string[] {
  return LEGAL_VOCABULARY;
}

/**
 * Common speaker roles in court proceedings
 */
export const SPEAKER_ROLES = [
  'Judge',
  "Plaintiff's Attorney",
  'Defense Attorney',
  'Witness',
  'Defendant',
  'Plaintiff',
  'Court Reporter',
  'Bailiff',
  'Clerk',
  'Expert Witness',
  'Interpreter',
];

/**
 * Default speaker colors for visual distinction
 */
export const SPEAKER_COLORS = [
  '#2563eb', // Blue
  '#dc2626', // Red
  '#16a34a', // Green
  '#9333ea', // Purple
  '#ea580c', // Orange
  '#0891b2', // Cyan
  '#be185d', // Pink
  '#4f46e5', // Indigo
];

/**
 * Get a color for a speaker index
 */
export function getSpeakerColor(index: number): string {
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
}

/**
 * Generate a formatted speaker label
 * @param index - 0-based index
 * @returns "Speaker 01", "Speaker 02", etc.
 */
export function getSpeakerLabel(index: number): string {
  return `Speaker ${String(index + 1).padStart(2, '0')}`;
}
