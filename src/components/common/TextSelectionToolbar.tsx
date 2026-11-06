import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquareQuote, Sparkles, FilePlus2, Copy, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export interface TextSelectionToolbarProps {
  containerRef: React.RefObject<HTMLElement | null>;
  onQuoteSelection: (selectedText: string) => void;
  onExplainSelection?: (selectedText: string) => void;
  onSendToCanvas?: (selectedText: string) => void;
  accentColor?: 'teal' | 'indigo';
}

interface SelectionState {
  text: string;
  top: number;
  left: number;
}

export const TextSelectionToolbar: React.FC<TextSelectionToolbarProps> = ({
  containerRef,
  onQuoteSelection,
  onExplainSelection,
  onSendToCanvas,
  accentColor = 'teal'
}) => {
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [copied, setCopied] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const clearSelectionToolbar = useCallback(() => {
    setSelection(null);
    setCopied(false);
  }, []);

  const evaluateSelection = useCallback(() => {
    if (typeof window === 'undefined') return;
    const domSelection = window.getSelection();
    if (!domSelection || domSelection.isCollapsed || domSelection.rangeCount === 0) {
      setSelection(null);
      return;
    }

    const rawText = domSelection.toString().trim();
    if (rawText.length < 5 || rawText.length > 1600) {
      setSelection(null);
      return;
    }

    const range = domSelection.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }

    const anchorEl =
      range.commonAncestorContainer instanceof HTMLElement
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;

    // Only show toolbar when selecting text inside an assistant response
    if (!anchorEl || !anchorEl.closest('[data-assistant-prose="true"]')) {
      setSelection(null);
      return;
    }

    // Ignore selection inside interactive inputs or textareas
    if (anchorEl.closest('input, textarea, button, [contenteditable="true"]')) {
      setSelection(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setSelection(null);
      return;
    }

    const viewportWidth = window.innerWidth;
    const clampedLeft = Math.min(Math.max(rect.left + rect.width / 2, 140), viewportWidth - 140);
    const topPosition = Math.max(rect.top - 46, 12);

    setSelection({
      text: rawText,
      top: topPosition,
      left: clampedLeft
    });
  }, [containerRef]);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      if (toolbarRef.current && toolbarRef.current.contains(e.target as Node)) {
        return;
      }
      window.setTimeout(evaluateSelection, 15);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelectionToolbar();
        return;
      }
      if (e.shiftKey) {
        window.setTimeout(evaluateSelection, 15);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (toolbarRef.current && toolbarRef.current.contains(e.target as Node)) {
        return;
      }
      setSelection(null);
    };

    const scroller = containerRef.current;
    const handleScroll = () => {
      setSelection(null);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleMouseDown);
    scroller?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousedown', handleMouseDown);
      scroller?.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, evaluateSelection, clearSelectionToolbar]);

  const handleQuote = () => {
    if (!selection) return;
    onQuoteSelection(selection.text);
    window.getSelection()?.removeAllRanges();
    clearSelectionToolbar();
  };

  const handleExplain = () => {
    if (!selection || !onExplainSelection) return;
    onExplainSelection(selection.text);
    window.getSelection()?.removeAllRanges();
    clearSelectionToolbar();
  };

  const handleSendCanvas = () => {
    if (!selection || !onSendToCanvas) return;
    onSendToCanvas(selection.text);
    window.getSelection()?.removeAllRanges();
    clearSelectionToolbar();
  };

  const handleCopy = async () => {
    if (!selection) return;
    try {
      await navigator.clipboard.writeText(selection.text);
      setCopied(true);
      setTimeout(() => {
        window.getSelection()?.removeAllRanges();
        clearSelectionToolbar();
      }, 650);
    } catch {
      clearSelectionToolbar();
    }
  };

  const isIndigo = accentColor === 'indigo';

  return (
    <AnimatePresence>
      {selection && (
        <motion.div
          ref={toolbarRef}
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.96 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: `${selection.top}px`,
            left: `${selection.left}px`,
            transform: 'translateX(-50%)'
          }}
          role="toolbar"
          aria-label="Aksi teks terpilih"
          className="z-[90] flex items-center gap-0.5 rounded-full border border-slate-700/80 bg-slate-900/95 px-1.5 py-1 text-xs text-slate-100 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95"
        >
          <button
            type="button"
            onClick={handleQuote}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-colors cursor-pointer whitespace-nowrap ${
              isIndigo
                ? 'hover:bg-indigo-500/25 hover:text-indigo-200 text-white'
                : 'hover:bg-teal-500/25 hover:text-teal-200 text-white'
            }`}
            title="Kutip bagian ini ke kotak pesan"
          >
            <MessageSquareQuote className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span>Tanya ini</span>
          </button>

          {onExplainSelection && (
            <>
              <div className="h-3.5 w-px bg-slate-700/80" aria-hidden="true" />
              <button
                type="button"
                onClick={handleExplain}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                title="Minta penjelasan lebih rinci untuk bagian ini"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span>Perjelas</span>
              </button>
            </>
          )}

          {onSendToCanvas && (
            <>
              <div className="h-3.5 w-px bg-slate-700/80" aria-hidden="true" />
              <button
                type="button"
                onClick={handleSendCanvas}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-slate-200 hover:bg-indigo-500/25 hover:text-indigo-200 transition-colors cursor-pointer whitespace-nowrap"
                title="Kirim kutipan ini ke Canvas"
              >
                <FilePlus2 className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                <span>Kirim ke Canvas</span>
              </button>
            </>
          )}

          <div className="h-3.5 w-px bg-slate-700/80" aria-hidden="true" />
          <button
            type="button"
            onClick={() => { void handleCopy(); }}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            title="Salin teks terpilih"
            aria-label="Salin teks terpilih"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
