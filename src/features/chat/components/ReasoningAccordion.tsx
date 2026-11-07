import React, { useEffect, useRef, useState } from 'react';
import { Brain, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

interface Props {
  thinking: string;
  isThinking: boolean;
}

export function ReasoningAccordion({ thinking, isThinking }: Props) {
  const [open, setOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const startRef = useRef(Date.now());
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isThinking) return;
    startRef.current = Date.now();
    const timer = setInterval(() => setSeconds(Math.round((Date.now() - startRef.current) / 1000)), 500);
    return () => clearInterval(timer);
  }, [isThinking]);

  if (!thinking && !isThinking) return null;

  const label = isThinking
    ? `Sedang menalar... ${seconds}s`
    : seconds > 0 ? `Berpikir selama ${seconds} detik` : 'Lihat proses berpikir';

  return (
    <div className={`not-prose mb-2 overflow-hidden rounded-2xl border bg-slate-50/70 text-xs transition-colors dark:bg-white/5 ${
      isThinking
        ? 'border-teal-300/60 dark:border-teal-500/30 shadow-[0_0_0_3px_var(--rt-glow-accent)]'
        : 'border-slate-200/70 dark:border-white/10'
    }`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors"
      >
        <Brain className={`h-3.5 w-3.5 text-teal-600 dark:text-teal-400 ${isThinking ? 'animate-pulse' : ''}`} />
        <span className="font-medium">{label}</span>
        <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="max-h-72 overflow-y-auto whitespace-pre-wrap border-t border-slate-200/70 dark:border-white/10 px-3.5 py-2.5 font-document text-[12.5px] italic leading-relaxed text-slate-500 dark:text-slate-400">
              {thinking}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
