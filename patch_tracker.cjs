const fs = require('fs');
let file = fs.readFileSync('src/features/mood/UserProgressTracker.tsx', 'utf8');

file = file.replace(
  `  const CHECKLIST_KEY = \`rt_self_care_\${user?.id || "guest"}\`;
  const [selfCareChecklist, setSelfCareChecklist] = useState<{ id: string; task: string; done: boolean }[]>(() => {
    const saved = localStorage.getItem(CHECKLIST_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: 'sc1', task: 'Lakukan Teknik Grounding 5-4-3-2-1 sekali hari ini', done: false },
      { id: 'sc2', task: 'Terapkan rehat sejenak 25 menit saat mengerjakan tugas/skripsi', done: false },
      { id: 'sc3', task: 'Jalan santai di luar ruangan selama 15 menit tanpa HP', done: false },
      { id: 'sc4', task: 'Sediakan waktu 30 menit bebas layar sebelum tidur malam', done: false }
    ];
  });`,
  `  const CHECKLIST_KEY = \`rt_self_care_\${user?.id || "guest"}\`;
  const defaultTasks = [
    { id: 'sc1', task: 'Lakukan Teknik Grounding 5-4-3-2-1 sekali hari ini', done: false },
    { id: 'sc2', task: 'Terapkan rehat sejenak 25 menit saat mengerjakan tugas/skripsi', done: false },
    { id: 'sc3', task: 'Jalan santai di luar ruangan selama 15 menit tanpa HP', done: false },
    { id: 'sc4', task: 'Sediakan waktu 30 menit bebas layar sebelum tidur malam', done: false }
  ];
  const [selfCareChecklist, setSelfCareChecklist] = useState<{ id: string; task: string; done: boolean }[]>(defaultTasks);
  
  useEffect(() => {
    if (!user || user.role === 'guest') {
      const saved = localStorage.getItem(CHECKLIST_KEY);
      if (saved) {
        try { 
          const parsed = JSON.parse(saved);
          setSelfCareChecklist(parsed);
        } catch (e) {}
      }
      return;
    }
    
    // Fetch from backend for authenticated users
    const dateStr = new Date().toISOString().split('T')[0];
    apiClient.get(\`/api/v1/user/selfcare?date=\${dateStr}\`).then(res => {
      if (res.success && res.data && res.data.tasks) {
        const backendTasks = res.data.tasks;
        setSelfCareChecklist(prev => {
          return prev.map(t => {
            const bt = backendTasks.find((b: any) => b.taskId === t.id);
            return bt ? { ...t, done: bt.isDone } : { ...t, done: false }; // always default to false from backend if not found
          });
        });
      }
    }).catch(console.error);
  }, [user]);`
);

file = file.replace(
  `  const handleToggleSelfCare = (id: string) => {
    setSelfCareChecklist(prev => {
      const next = prev.map(item => item.id === id ? { ...item, done: !item.done } : item);
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
      return next;
    });
    showToast('Tugas perawatan mandiri diperbarui!');
  };`,
  `  const handleToggleSelfCare = async (id: string) => {
    const dateStr = new Date().toISOString().split('T')[0];
    const itemToToggle = selfCareChecklist.find(i => i.id === id);
    if (!itemToToggle) return;
    const newStatus = !itemToToggle.done;

    // Optimistic UI
    setSelfCareChecklist(prev => {
      const next = prev.map(item => item.id === id ? { ...item, done: newStatus } : item);
      if (!user || user.role === 'guest') {
        localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
      }
      return next;
    });

    if (user && user.role !== 'guest') {
      try {
        const res = await apiClient.put('/api/v1/user/selfcare', {
          taskId: id,
          date: dateStr,
          isDone: newStatus
        });
        if (!res.success) throw new Error(res.error);
        showToast('Tugas perawatan mandiri diperbarui!');
      } catch (err) {
        // Rollback on failure
        setSelfCareChecklist(prev => prev.map(item => item.id === id ? { ...item, done: !newStatus } : item));
        showToast('Gagal menyimpan tugas', 'error');
      }
    } else {
      showToast('Tugas perawatan mandiri diperbarui!');
    }
  };`
);

fs.writeFileSync('src/features/mood/UserProgressTracker.tsx', file);
