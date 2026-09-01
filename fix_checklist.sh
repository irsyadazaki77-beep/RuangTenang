sed -i 's/const \[selfCareChecklist, setSelfCareChecklist\] = useState<{ id: string; task: string; done: boolean }>(\[/const { user } = useAuth();\n  const CHECKLIST_KEY = `rt_self_care_${user?.userId || "guest"}`;\n  const [selfCareChecklist, setSelfCareChecklist] = useState<{ id: string; task: string; done: boolean }[]>(() => {\n    const saved = localStorage.getItem(CHECKLIST_KEY);\n    if (saved) {\n      try { return JSON.parse(saved); } catch (e) {}\n    }\n    return [\n/g' src/features/mood/UserProgressTracker.tsx

sed -i '/import { calculateStreak }/i\import { useAuth } from "../../contexts/AuthContext";' src/features/mood/UserProgressTracker.tsx

sed -i '/setSelfCareChecklist(prev =>/c\    setSelfCareChecklist(prev => {\n      const next = prev.map(item => item.id === id ? { ...item, done: !item.done } : item);\n      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));\n      return next;\n    });' src/features/mood/UserProgressTracker.tsx
