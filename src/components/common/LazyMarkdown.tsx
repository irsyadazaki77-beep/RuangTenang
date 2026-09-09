import React, { Suspense } from 'react';
import { lazyWithRetry } from '../../lib/lazyWithRetry';

const MarkdownRenderer = lazyWithRetry(() => import('./MarkdownRenderer'));

interface Props {
  content: string;
}

export const LazyMarkdown: React.FC<Props> = ({ content }) => {
  return (
    <Suspense fallback={<div className="whitespace-pre-wrap">{content}</div>}>
      <MarkdownRenderer content={content} />
    </Suspense>
  );
};
