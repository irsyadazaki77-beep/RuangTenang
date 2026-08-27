const fs = require('fs');
let content = fs.readFileSync('src/lib/clinicalScoring.ts', 'utf-8');

if (!content.includes('REQUIRES CLINICAL REVIEW BEFORE PRODUCTION')) {
  content = `/**
 * @fileoverview Clinical Scoring Config
 * 
 * IMPORTANT: REQUIRES CLINICAL REVIEW BEFORE PRODUCTION
 * The instruments (PHQ-9, GAD-7) and scoring thresholds here are adapted for 
 * initial screening purposes only. They have not undergone formal clinical 
 * validation for diagnostic accuracy in this specific digital implementation.
 * Do not use for medical diagnosis without professional oversight.
 */\n\n` + content;
  fs.writeFileSync('src/lib/clinicalScoring.ts', content);
}
