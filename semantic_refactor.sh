#!/bin/bash
find src/ -type f -name "*.tsx" -o -name "*.ts" | while read -r file; do
  sed -i 's/bg-white dark:bg-slate-900/surface-card/g' "$file"
  sed -i 's/bg-white dark:bg-slate-950/surface-page/g' "$file"
  sed -i 's/bg-slate-50 dark:bg-slate-800\/60/surface-muted/g' "$file"
  sed -i 's/bg-slate-50 dark:bg-slate-900\/60/surface-muted/g' "$file"
  sed -i 's/bg-slate-50 dark:bg-slate-800/surface-muted/g' "$file"
  
  sed -i 's/text-slate-900 dark:text-slate-100/text-primary/g' "$file"
  sed -i 's/text-slate-800 dark:text-slate-200/text-primary/g' "$file"
  sed -i 's/text-slate-900 dark:text-slate-50/text-primary/g' "$file"

  sed -i 's/text-slate-500 dark:text-slate-400/text-secondary/g' "$file"
  sed -i 's/text-slate-600 dark:text-slate-400/text-secondary/g' "$file"
  sed -i 's/text-slate-600 dark:text-slate-300/text-secondary/g' "$file"
  sed -i 's/text-slate-700 dark:text-slate-300/text-secondary/g' "$file"
  
  sed -i 's/text-slate-400 dark:text-slate-500/text-muted/g' "$file"

  sed -i 's/border-slate-200 dark:border-slate-800/border-default/g' "$file"
  sed -i 's/border-slate-200\/80 dark:border-slate-800/border-default/g' "$file"
  sed -i 's/border-slate-300 dark:border-slate-700/border-strong/g' "$file"
  
  # Also non-dark mode hardcoded ones
  sed -i 's/bg-white border border-slate-200/surface-card/g' "$file"
  sed -i 's/bg-white border border-slate-300/surface-card border-strong/g' "$file"
  sed -i 's/bg-white shadow/surface-card shadow/g' "$file"
done
