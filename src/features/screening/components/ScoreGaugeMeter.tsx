import React from 'react';

// SVG Circular Gauge Component for Scores
export const ScoreGaugeMeter: React.FC<{
  score: number;
  maxScore: number;
  severity: string;
  label: string;
}> = ({ score, maxScore, severity, label }) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(Math.max(score / maxScore, 0), 1);
  const strokeDashoffset = circumference - percentage * circumference;

  let colorClass = 'stroke-teal-500 text-teal-600 dark:text-teal-400';
  let badgeBg = 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800';

  if (severity === 'Ringan') {
    colorClass = 'stroke-sky-500 text-sky-600 dark:text-sky-400';
    badgeBg = 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800';
  } else if (severity === 'Sedang') {
    colorClass = 'stroke-amber-500 text-amber-600 dark:text-amber-400';
    badgeBg = 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  } else if (severity === 'Sedang-Berat' || severity === 'Berat') {
    colorClass = 'stroke-rose-500 text-rose-600 dark:text-rose-400';
    badgeBg = 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
  }

  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-4 surface-card rounded-2xl border border-default shadow-3xs hover:shadow-2xs transition-all relative overflow-hidden">
      <span className="text-xs font-semibold text-secondary mb-2 text-center">{label}</span>
      
      <div className="relative w-28 h-28 flex items-center justify-center my-1">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background Track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="stroke-slate-100 dark:stroke-slate-800"
            strokeWidth="9"
            fill="transparent"
          />
          {/* Animated Progress Circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className={`transition-all duration-700 ease-out ${colorClass}`}
            strokeWidth="9"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl sm:text-3xl font-extrabold font-sans text-primary tracking-tight">
            {score}
          </span>
          <span className="text-[10px] font-medium text-secondary -mt-0.5">/ {maxScore}</span>
        </div>
      </div>

      <div className={`mt-2 px-2.5 py-1 rounded-full text-[10.5px] font-bold border ${badgeBg}`}>
        Tingkat {severity}
      </div>
    </div>
  );
};

