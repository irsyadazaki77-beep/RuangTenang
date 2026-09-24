import { WorkspaceArtifact, ArtifactType } from '../types';

export interface ExtractedArtifactResult {
  cleanedText: string;
  artifacts: WorkspaceArtifact[];
  activeStreamingArtifact: WorkspaceArtifact | null;
}

export interface ParsedTagAttributes {
  type: ArtifactType;
  title: string;
  language?: string;
  id?: string;
}

/**
 * Robust XML/HTML entity unescaper
 */
export function unescapeXmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * State-machine based attribute parser that handles quotes, escaping, and whitespace variations.
 * Example: `type="code" title="Skrip Analisis Data &amp; Statistik" language="python"`
 */
export function parseTagAttributes(attrString: string): ParsedTagAttributes {
  const result: ParsedTagAttributes = {
    type: 'DOCUMENT',
    title: 'Dokumen Akademik'
  };

  if (!attrString || !attrString.trim()) {
    return result;
  }

  let index = 0;
  const len = attrString.length;

  while (index < len) {
    // Skip whitespace and curly braces
    while (index < len && (/\s/.test(attrString[index]) || attrString[index] === '{' || attrString[index] === '}')) {
      index++;
    }
    if (index >= len) break;

    // Read attribute name
    const keyStart = index;
    while (index < len && /[a-zA-Z0-9_-]/.test(attrString[index])) {
      index++;
    }
    const key = attrString.substring(keyStart, index).toLowerCase();

    // Skip whitespace around '='
    while (index < len && (/\s/.test(attrString[index]) || attrString[index] === '{' || attrString[index] === '}')) {
      index++;
    }

    if (index < len && attrString[index] === '=') {
      index++; // consume '='
      while (index < len && (/\s/.test(attrString[index]) || attrString[index] === '{' || attrString[index] === '}')) {
        index++;
      }

      let value = '';
      if (index < len) {
        const quoteChar = attrString[index];
        if (quoteChar === '"' || quoteChar === "'") {
          index++; // consume quote
          const valStart = index;
          while (index < len && attrString[index] !== quoteChar) {
            index++;
          }
          value = attrString.substring(valStart, index);
          if (index < len && attrString[index] === quoteChar) {
            index++; // consume closing quote
          }
        } else {
          // Unquoted value
          const valStart = index;
          while (index < len && !/\s|>|\}/.test(attrString[index])) {
            index++;
          }
          value = attrString.substring(valStart, index);
        }
      }

      const cleanValue = unescapeXmlEntities(value.trim());

      if (key === 'type') {
        const upperType = cleanValue.toUpperCase();
        if (upperType === 'CODE' || upperType === 'CITATION' || upperType === 'OUTLINE' || upperType === 'DOCUMENT') {
          result.type = upperType as ArtifactType;
        } else if (upperType === 'MARKDOWN' || upperType === 'TEXT' || upperType === 'MD') {
          result.type = 'DOCUMENT';
          result.language = 'markdown';
        } else {
          result.type = 'DOCUMENT';
        }
      } else if (key === 'title') {
        result.title = cleanValue || 'Dokumen Akademik';
      } else if (key === 'language' || key === 'lang') {
        result.language = cleanValue.toLowerCase();
      } else if (key === 'id') {
        result.id = cleanValue;
      }
    }
  }

  // Sensible default language if type is CODE and none was given
  if (result.type === 'CODE' && !result.language) {
    result.language = 'javascript';
  }

  return result;
}

/**
 * State-Machine Artifact Parser
 * 
 * Features:
 * 1. State machine tracking: TEXT, CODE_BLOCK (```), TAG_OPENING, ARTIFACT_BODY
 * 2. Markdown Code Block Immunity: Code fences (```...```) containing `<artifact>` or `</artifact>` are safely bypassed.
 * 3. Nested Tag Handling: Tracks depth of nested `<artifact>` blocks without breaking outer tag boundaries.
 * 4. Streaming Token Engine: Smoothly extracts in-progress streaming artifacts without flickering or broken UI rendering.
 * 5. Clean Replacement Spans: Replaces artifact blocks in chat text with accessible visual indicator quotes.
 */
export function parseArtifactsFromText(text: string, isStreaming = false): ExtractedArtifactResult {
  if (!text || typeof text !== 'string') {
    return { cleanedText: '', artifacts: [], activeStreamingArtifact: null };
  }

  const artifacts: WorkspaceArtifact[] = [];
  let activeStreamingArtifact: WorkspaceArtifact | null = null;

  interface ReplacementSpan {
    start: number;
    end: number;
    replacement: string;
  }
  const replacementSpans: ReplacementSpan[] = [];

  let index = 0;
  const len = text.length;
  let artifactCount = 0;

  // Track outer code block state
  let inCodeBlock = false;
  let codeBlockFenceLength = 0;

  while (index < len) {
    // 1. Check for Markdown code fence (``` or ````)
    if (text[index] === '`') {
      let fenceCount = 0;
      let fIndex = index;
      while (fIndex < len && text[fIndex] === '`') {
        fenceCount++;
        fIndex++;
      }

      if (fenceCount >= 3) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockFenceLength = fenceCount;
          index = fIndex;
          continue;
        } else if (fenceCount >= codeBlockFenceLength) {
          inCodeBlock = false;
          codeBlockFenceLength = 0;
          index = fIndex;
          continue;
        }
      }
    }

    // 2. If inside code block, skip characters to preserve code block content
    if (inCodeBlock) {
      index++;
      continue;
    }

    // 3. Check for '<artifact' or ':::artifact' tag start
    const isXmlArtifact = text.startsWith('<artifact', index);
    const isDirectiveArtifact = text.startsWith(':::artifact', index);

    if (isXmlArtifact || isDirectiveArtifact) {
      const tagPrefixLen = isDirectiveArtifact ? 11 : 9;
      const tagStartIndex = index;
      const charAfterTag = text[index + tagPrefixLen];

      // Must be followed by space, newline, tab, '>', or '{'
      if (charAfterTag === undefined || /\s|>|\{/.test(charAfterTag)) {
        let openTagCloseIndex = -1;
        let attrContent = '';
        let bodyStartIndex = -1;

        if (isDirectiveArtifact) {
          const nextNewline = text.indexOf('\n', index + tagPrefixLen);
          const nextBrace = text.indexOf('}', index + tagPrefixLen);

          if (nextBrace !== -1 && (nextNewline === -1 || nextBrace < nextNewline)) {
            openTagCloseIndex = nextBrace;
            attrContent = text.substring(index + tagPrefixLen, nextBrace + 1);
            const afterBrace = nextBrace + 1;
            bodyStartIndex = (afterBrace < len && text[afterBrace] === '\n') ? afterBrace + 1 : afterBrace;
          } else if (nextNewline !== -1) {
            openTagCloseIndex = nextNewline;
            attrContent = text.substring(index + tagPrefixLen, nextNewline);
            bodyStartIndex = nextNewline + 1;
          } else {
            openTagCloseIndex = -1;
          }
        } else {
          openTagCloseIndex = text.indexOf('>', index + 9);
          if (openTagCloseIndex !== -1) {
            attrContent = text.substring(index + 9, openTagCloseIndex);
            bodyStartIndex = openTagCloseIndex + 1;
          }
        }

        if (openTagCloseIndex === -1) {
          // Opening tag is incomplete (streaming in progress)
          if (isStreaming) {
            const rawHeader = text.substring(index + tagPrefixLen);
            const attrs = parseTagAttributes(rawHeader);
            activeStreamingArtifact = {
              id: attrs.id || `art_streaming_${Date.now()}`,
              title: attrs.title || 'Dokumen Akademik (Live)',
              type: attrs.type,
              language: attrs.language,
              content: '',
              version: 1,
              updatedAt: new Date().toISOString()
            };
            replacementSpans.push({
              start: tagStartIndex,
              end: len,
              replacement: '\n\n*(Sedang menyusun artefak di Canvas...)*\n\n'
            });
          }
          break;
        }

        const attrs = parseTagAttributes(attrContent);

        // Scan for matching closing tag with nested tag depth & inner code block awareness
        let scanPos = bodyStartIndex;
        let nestingDepth = 0;
        let foundClosingTag = false;
        let bodyEndIndex = -1;
        let tagEndIndex = -1;

        let inInnerCodeBlock = false;
        let innerCodeFenceLen = 0;

        while (scanPos < len) {
          // Check for inner markdown code fence
          if (text[scanPos] === '`') {
            let innerFenceCount = 0;
            let infIndex = scanPos;
            while (infIndex < len && text[infIndex] === '`') {
              innerFenceCount++;
              infIndex++;
            }

            if (innerFenceCount >= 3) {
              if (!inInnerCodeBlock) {
                inInnerCodeBlock = true;
                innerCodeFenceLen = innerFenceCount;
                scanPos = infIndex;
                continue;
              } else if (innerFenceCount >= innerCodeFenceLen) {
                inInnerCodeBlock = false;
                innerCodeFenceLen = 0;
                scanPos = infIndex;
                continue;
              }
            }
          }

          // If not inside inner code block, check for closing tag
          if (!inInnerCodeBlock) {
            if (isDirectiveArtifact) {
              if (text.startsWith('\n:::', scanPos) || (scanPos === bodyStartIndex && text.startsWith(':::', scanPos))) {
                foundClosingTag = true;
                bodyEndIndex = scanPos;
                const afterColonPos = text.startsWith('\n:::', scanPos) ? scanPos + 4 : scanPos + 3;
                let endOfDirective = afterColonPos;
                while (endOfDirective < len && text[endOfDirective] !== '\n') {
                  endOfDirective++;
                }
                if (endOfDirective < len && text[endOfDirective] === '\n') {
                  endOfDirective++;
                }
                tagEndIndex = endOfDirective;
                break;
              }
            } else {
              if (text.startsWith('<artifact', scanPos)) {
                const charAfterInner = text[scanPos + 9];
                if (charAfterInner === undefined || /\s|>/.test(charAfterInner)) {
                  nestingDepth++;
                  scanPos += 9;
                  continue;
                }
              }

              if (text.startsWith('</artifact>', scanPos)) {
                if (nestingDepth > 0) {
                  nestingDepth--;
                  scanPos += 11;
                  continue;
                } else {
                  foundClosingTag = true;
                  bodyEndIndex = scanPos;
                  tagEndIndex = scanPos + 11;
                  break;
                }
              }
            }
          }

          scanPos++;
        }

        if (foundClosingTag) {
          const rawContent = text.substring(bodyStartIndex, bodyEndIndex);
          artifactCount++;

          const artifact: WorkspaceArtifact = {
            id: attrs.id || `art_${Date.now()}_${artifactCount}`,
            title: attrs.title,
            type: attrs.type,
            language: attrs.language,
            content: rawContent.trim(),
            version: 1,
            updatedAt: new Date().toISOString()
          };

          artifacts.push(artifact);

          const replacementText = `\n\n> 📦 **Artefak Aktif (${artifact.type}):** *${artifact.title}* *(Tersedia dan dapat diedit di Canvas Panel)*\n\n`;
          replacementSpans.push({
            start: tagStartIndex,
            end: tagEndIndex,
            replacement: replacementText
          });

          index = tagEndIndex;
          continue;
        } else {
          // Closing tag not found yet (streaming in progress or truncated LLM output)
          const streamingBody = text.substring(bodyStartIndex);

          if (isStreaming) {
            activeStreamingArtifact = {
              id: attrs.id || `art_streaming_${Date.now()}`,
              title: attrs.title || 'Dokumen Akademik (Live)',
              type: attrs.type,
              language: attrs.language,
              content: streamingBody,
              version: 1,
              updatedAt: new Date().toISOString()
            };
            replacementSpans.push({
              start: tagStartIndex,
              end: len,
              replacement: '\n\n*(Sedang memperbarui artefak di Canvas...)*\n\n'
            });
          } else {
            // Completed message with unclosed artifact -> recover gracefully
            if (streamingBody.trim().length > 0) {
              artifactCount++;
              const recoveredArtifact: WorkspaceArtifact = {
                id: attrs.id || `art_${Date.now()}_${artifactCount}`,
                title: attrs.title,
                type: attrs.type,
                language: attrs.language,
                content: streamingBody.trim(),
                version: 1,
                updatedAt: new Date().toISOString()
              };
              artifacts.push(recoveredArtifact);
              replacementSpans.push({
                start: tagStartIndex,
                end: len,
                replacement: `\n\n> 📦 **Artefak Aktif (${recoveredArtifact.type}):** *${recoveredArtifact.title}* *(Tersedia dan dapat diedit di Canvas Panel)*\n\n`
              });
            }
          }
          break;
        }
      }
    }

    index++;
  }

  // Apply replacement spans in reverse order to preserve string index positions
  let cleanedText = text;
  replacementSpans.sort((a, b) => b.start - a.start);
  for (const span of replacementSpans) {
    cleanedText = cleanedText.substring(0, span.start) + span.replacement + cleanedText.substring(span.end);
  }

  return {
    cleanedText: cleanedText.trim(),
    artifacts,
    activeStreamingArtifact
  };
}
