import React, { useState, useEffect, useRef } from 'react';
import { LazyMarkdown } from './LazyMarkdown';

interface Props {
  content: string;
}

/**
 * Throttles AST parsing during token streaming (100ms cadence)
 * to maintain 60 FPS and prevent main thread thrashing on long responses,
 * while keeping human-perceived text streaming fluid and natural.
 */
export const StreamingMarkdown: React.FC<Props> = React.memo(({ content }) => {
  const [displayContent, setDisplayContent] = useState(content);
  const lastUpdateRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef(content);
  latestContentRef.current = content;

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastUpdateRef.current;

    // Short content renders immediately; longer streaming text is throttled to 100ms
    if (content.length < 150 || elapsed >= 100) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      lastUpdateRef.current = now;
      setDisplayContent(content);
    } else if (!timerRef.current) {
      timerRef.current = setTimeout(() => {
        lastUpdateRef.current = Date.now();
        setDisplayContent(latestContentRef.current);
        timerRef.current = null;
      }, Math.max(0, 100 - elapsed));
    }
  }, [content]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return <LazyMarkdown content={displayContent} />;
});

StreamingMarkdown.displayName = 'StreamingMarkdown';
