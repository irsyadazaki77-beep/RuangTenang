import type { FileSourceReference } from '../../../shared/contracts/files.js';

export interface ResponseQualityAssessment {
  isValid: boolean;
  score: number; // 0 to 1
  flags: {
    isEmpty: boolean;
    isTruncatedCodeBlock: boolean;
    isTruncatedSentence: boolean;
    hasMalformedJson: boolean;
    hasUnverifiedCitations: boolean;
    hasUnacknowledgedUncertainty: boolean;
  };
  reasons: string[];
  suggestedAction?: 'pass' | 'repair' | 'block';
  repairedText?: string;
}

export interface ValidationOptions {
  allowedSources?: FileSourceReference[];
  requireCodeBlockClosure?: boolean;
  strictCitationVerification?: boolean;
}

/**
 * Validates generated AI responses for formatting integrity,
 * unclosed code fences, citation authenticity, and uncertainty handling.
 */
export class ResponseQualityValidator {
  /**
   * Evaluates text response against structural, code, citation, and reasoning quality metrics.
   */
  public static assessQuality(
    text: string,
    options: ValidationOptions = {}
  ): ResponseQualityAssessment {
    const trimmed = (text || '').trim();
    const flags = {
      isEmpty: false,
      isTruncatedCodeBlock: false,
      isTruncatedSentence: false,
      hasMalformedJson: false,
      hasUnverifiedCitations: false,
      hasUnacknowledgedUncertainty: false
    };
    const reasons: string[] = [];

    // 1. Empty or whitespace check
    if (!trimmed) {
      flags.isEmpty = true;
      reasons.push('RESPONSE_EMPTY_OR_WHITESPACE');
      return {
        isValid: false,
        score: 0,
        flags,
        reasons,
        suggestedAction: 'block'
      };
    }

    let score = 1.0;

    // 2. Truncated code blocks (odd number of triple backticks)
    const codeFenceMatches = text.match(/```/g);
    const codeFenceCount = codeFenceMatches ? codeFenceMatches.length : 0;
    let repaired = text;

    if (codeFenceCount % 2 !== 0) {
      flags.isTruncatedCodeBlock = true;
      score -= 0.3;
      reasons.push('TRUNCATED_CODE_BLOCK');
      // Proactively repair unclosed fence for downstream rendering safety
      repaired = `${repaired}\n\`\`\``;
    }

    // 3. Truncated sentence detection (abrupt end on dangling conjunction/preposition or trailing comma)
    if (/\b(karena|seperti|yaitu|adalah|dan|atau|tetapi|namun|dengan|pada|ke|di|bahwa|sehingga|and|or|because|which|that|with)\s*$/i.test(trimmed) || /,\s*$/.test(trimmed)) {
      flags.isTruncatedSentence = true;
      score -= 0.2;
      reasons.push('ABRUPT_SENTENCE_TRUNCATION');
    }

    // 4. Citation Integrity
    if (options.allowedSources && options.allowedSources.length > 0) {
      const allowedCitationIds = new Set(
        options.allowedSources
          .map(s => s.citationId)
          .filter((id): id is string => Boolean(id))
      );

      const foundCitationMatches = [...text.matchAll(/\[cite:([A-Za-z0-9_-]+)\]/g)];
      const unverifiedIds: string[] = [];

      for (const match of foundCitationMatches) {
        const id = match[1];
        if (!allowedCitationIds.has(id)) {
          unverifiedIds.push(id);
        }
      }

      if (unverifiedIds.length > 0) {
        flags.hasUnverifiedCitations = true;
        score -= 0.4;
        reasons.push(`UNVERIFIED_CITATION_IDS: ${unverifiedIds.join(', ')}`);
        if (options.strictCitationVerification) {
          // In strict mode, strip illegitimate citations from repaired text
          for (const invalidId of unverifiedIds) {
            const regex = new RegExp(`\\[cite:${invalidId}\\]`, 'g');
            repaired = repaired.replace(regex, '');
          }
        }
      }
    }

    // 5. Tool / JSON Call Validation if output appears to be a tool call
    if (trimmed.startsWith('{') && trimmed.includes('"tool_call"')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (!parsed.tool_call || typeof parsed.tool_call !== 'string') {
          flags.hasMalformedJson = true;
          score -= 0.5;
          reasons.push('MALFORMED_TOOL_CALL_SCHEMA');
        }
      } catch (e) {
        flags.hasMalformedJson = true;
        score -= 0.6;
        reasons.push('INVALID_JSON_TOOL_CALL');
      }
    }

    // 6. Calculate validity and actions
    const isValid = score >= 0.5 && !flags.isEmpty;
    const suggestedAction: 'pass' | 'repair' | 'block' = !isValid
      ? 'block'
      : (flags.isTruncatedCodeBlock || flags.hasUnverifiedCitations)
        ? 'repair'
        : 'pass';

    return {
      isValid,
      score: Math.max(0, Math.min(1, score)),
      flags,
      reasons,
      suggestedAction,
      repairedText: suggestedAction === 'repair' ? repaired : undefined
    };
  }
}
