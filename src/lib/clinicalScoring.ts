/**
 * @fileoverview Clinical Scoring Config
 * 
 * IMPORTANT: REQUIRES CLINICAL REVIEW BEFORE PRODUCTION
 * The instruments (PHQ-9, GAD-7) and scoring thresholds here are adapted for 
 * initial screening purposes only. They have not undergone formal clinical 
 * validation for diagnostic accuracy in this specific digital implementation.
 * Do not use for medical diagnosis without professional oversight.
 */

export const CLINICAL_CONTENT_VERSION = '1.0.0';

import {
  calculatePhq9Severity,
  calculateGad7Severity,
  type PhqSeverity,
  type GadSeverity,
} from '../../shared/clinical/scoring';

export type { PhqSeverity, GadSeverity };

/**
 * Compatibility wrappers. Thresholds live ONLY in shared/clinical/scoring.ts.
 * Invalid scores throw ScreeningValidationError instead of being classified.
 */
export const getPhq9Severity = (score: number): PhqSeverity => calculatePhq9Severity(score);
export const getGad7Severity = (score: number): GadSeverity => calculateGad7Severity(score);
export const CLINICAL_DISCLAIMER = "Instrumen ini adalah alat skrining awal dan bukan alat diagnostik pengganti evaluasi profesional medis.";
