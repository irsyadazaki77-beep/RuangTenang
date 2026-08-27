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

export type PhqSeverity = 'Minimal' | 'Ringan' | 'Sedang' | 'Sedang-Berat' | 'Berat';
export type GadSeverity = 'Minimal' | 'Ringan' | 'Sedang' | 'Berat';

/**
 * PHQ-9 Original Scoring Standard
 * 0-4: Minimal
 * 5-9: Mild (Ringan)
 * 10-14: Moderate (Sedang)
 * 15-19: Moderately Severe (Sedang-Berat)
 * 20-27: Severe (Berat)
 */
export const getPhq9Severity = (score: number): PhqSeverity => {
  if (score <= 4) return 'Minimal';
  if (score <= 9) return 'Ringan';
  if (score <= 14) return 'Sedang';
  if (score <= 19) return 'Sedang-Berat';
  return 'Berat';
};

/**
 * GAD-7 Original Scoring Standard
 * 0-4: Minimal
 * 5-9: Mild (Ringan)
 * 10-14: Moderate (Sedang)
 * 15-21: Severe (Berat)
 */
export const getGad7Severity = (score: number): GadSeverity => {
  if (score <= 4) return 'Minimal';
  if (score <= 9) return 'Ringan';
  if (score <= 14) return 'Sedang';
  return 'Berat';
};

export const CLINICAL_DISCLAIMER = "Instrumen ini adalah alat skrining awal dan bukan alat diagnostik pengganti evaluasi profesional medis.";
