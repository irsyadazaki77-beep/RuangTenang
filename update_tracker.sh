sed -i '/const uniqueActiveDays = React.useMemo/,/}, \[moodLogs\]);/c\  const totalActiveDays = React.useMemo(() => {\n    if (!moodLogs || moodLogs.length === 0) return 0;\n    return new Set(moodLogs.map(l => l.date)).size;\n  }, [moodLogs]);\n\n  const streakCount = React.useMemo(() => {\n    if (!moodLogs || moodLogs.length === 0) return 0;\n    return calculateStreak(moodLogs.map(l => l.date));\n  }, [moodLogs]);' src/features/mood/UserProgressTracker.tsx

sed -i 's/uniqueActiveDays/totalActiveDays/g' src/features/mood/UserProgressTracker.tsx
