import React from 'react';
import { motion } from 'motion/react';
import { Inbox, FileText, Calendar, Users, Activity, Sparkles, Info } from 'lucide-react';

export type EmptyStateIconType = 'inbox' | 'document' | 'calendar' | 'users' | 'activity' | 'ai' | 'info';

interface EmptyStateProps {
  icon?: EmptyStateIconType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const iconMap = {
  inbox: Inbox,
  document: FileText,
  calendar: Calendar,
  users: Users,
  activity: Activity,
  ai: Sparkles,
  info: Info,
};

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  const Icon = iconMap[icon];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center p-8 text-center bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm ${className}`}
    >
      <div className="w-16 h-16 mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1.5">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
