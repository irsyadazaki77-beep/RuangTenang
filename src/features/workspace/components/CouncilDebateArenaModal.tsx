import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  X,
  RotateCcw,
  CheckCircle2,
  Send,
  FileText
} from 'lucide-react';
import {
  CouncilDebateResult,
  CouncilDebateTurn,
  runCouncilDebate,
  COUNCIL_MEMBERS
} from '../../../../server/services/agent/agentCouncilDebateService';

interface CouncilDebateArenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: string;
  onSaveRevisionToCanvas?: (markdown: string, title: string) => void;
}

export const CouncilDebateArenaModal: React.FC<CouncilDebateArenaModalProps> = ({
  isOpen,
  onClose,
  initialTopic = 'Pengembangan Sistem Cerdas Terintegrasi',
  onSaveRevisionToCanvas
}) => {
  const [topic] = useState(initialTopic);
  const [debateData, setDebateData] = useState<CouncilDebateResult | null>(null);
  const [visibleTurnsCount, setVisibleTurnsCount] = useState<number>(0);
  const [isDebating, setIsDebating] = useState<boolean>(false);
  const [studentRebuttal, setStudentRebuttal] = useState('');
  const [interruptedTurns, setInterruptedTurns] = useState<CouncilDebateTurn[]>([]);

  // Start initial debate
  const handleStartDebate = useCallback(async () => {
    setIsDebating(true);
    setVisibleTurnsCount(1);
    setInterruptedTurns([]);
    const res = await runCouncilDebate(topic);
    setDebateData(res);
  }, [topic]);

  useEffect(() => {
    if (isOpen && !debateData) {
      handleStartDebate();
    }
  }, [isOpen, debateData, handleStartDebate]);

  // Progressive turn appearance simulation
  useEffect(() => {
    if (isDebating && debateData && visibleTurnsCount < debateData.turns.length) {
      const timer = setTimeout(() => {
        setVisibleTurnsCount(prev => prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    } else if (debateData && visibleTurnsCount >= debateData.turns.length) {
      setIsDebating(false);
    }
  }, [isDebating, debateData, visibleTurnsCount]);

  if (!isOpen) return null;

  const currentTurns = debateData ? debateData.turns.slice(0, visibleTurnsCount) : [];
  const allDisplayTurns = [...currentTurns, ...interruptedTurns];

  const handleSendRebuttal = () => {
    if (!studentRebuttal.trim()) return;
    const userTurn: CouncilDebateTurn = {
      id: `student_${Date.now()}`,
      personaId: 'supervisor',
      personaName: 'Anda (Mahasiswa)',
      personaRole: 'Klarifikasi Mahasiswa',
      avatarBg: 'bg-slate-900 text-white',
      avatarText: 'ME',
      stance: 'affirmative',
      statement: studentRebuttal,
      referencedStandard: 'Argumen Langsung Sidang'
    };
    setInterruptedTurns(prev => [...prev, userTurn]);
    setStudentRebuttal('');
  };

  const handleSaveToCanvas = () => {
    if (!debateData) return;
    const md = `# Risalah Sidang Dewan Penguji AI (Council Debate)
**Topik Penelitian:** ${debateData.topic}
**Waktu Sidang:** ${new Date(debateData.timestamp).toLocaleString('id-ID')}
**Status Keputusan:** ${debateData.verdictLabel} (${debateData.confidenceScore}% Kepercayaan Dewan)

---

## 1. Konsensus Dewan Penguji
${debateData.consensus}

## 2. Risalah Perdebatan Dewan
${debateData.turns.map(t => `### ${t.personaName} (${t.personaRole})\n*Sikap:* **${t.stance.toUpperCase()}** | *Dasar:* ${t.referencedStandard}\n\n> "${t.statement}"\n`).join('\n')}

## 3. Tindak Lanjut Revisi Wajib Mahasiswa
${debateData.revisionActionItems.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}
`;
    onSaveRevisionToCanvas?.(md, `Risalah Dewan AI - ${debateData.topic.slice(0, 30)}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                  Arena Debat Dewan Penguji AI (Multi-Agent Council)
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                  3 Dosen Independen
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Saksikan 3 agen AI pakar menguji dan mendiskusikan naskah skripsi Anda
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartDebate}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Mulai Ulang Debat"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Council Panel Strip */}
        <div className="px-5 py-2.5 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3 text-xs overflow-x-auto">
          <div className="flex items-center gap-4">
            {COUNCIL_MEMBERS.map(m => (
              <div key={m.id} className="flex items-center gap-2 shrink-0">
                <div className={`w-6 h-6 rounded-md font-bold text-[10px] flex items-center justify-center ${m.avatarBg}`}>
                  {m.avatarText}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] leading-tight">
                    {m.name}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {m.focus}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {isDebating && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
              <span>Sidang Sedang Berlangsung...</span>
            </div>
          )}
        </div>

        {/* Debate Transcript Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {allDisplayTurns.map((turn) => (
            <div
              key={turn.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2 animate-fade-in"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${turn.avatarBg}`}>
                    {turn.avatarText}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                      {turn.personaName}
                    </h5>
                    <p className="text-[10px] text-slate-400">
                      {turn.personaRole} · Dasar: <span className="text-slate-600 dark:text-slate-300 font-medium">{turn.referencedStandard}</span>
                    </p>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  turn.stance === 'affirmative'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : turn.stance === 'critical'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                }`}>
                  {turn.stance.toUpperCase()}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed pl-10.5">
                "{turn.statement}"
              </p>
            </div>
          ))}

          {/* Verdict Box when all turns complete */}
          {debateData && !isDebating && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 space-y-3 animate-scale-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="font-bold text-indigo-950 dark:text-indigo-100 text-sm">
                    Keputusan Dewan: {debateData.verdictLabel}
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300">
                  Tingkat Konsensus: {debateData.confidenceScore}%
                </span>
              </div>

              <p className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
                {debateData.consensus}
              </p>

              <div className="space-y-1.5 pt-2 border-t border-indigo-200/60 dark:border-indigo-900/60">
                <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200">
                  Daftar Revisi Wajib Mahasiswa:
                </span>
                <ul className="space-y-1">
                  {debateData.revisionActionItems.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveToCanvas}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>Simpan Risalah & Catatan Revisi ke Canvas</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Student Interruption Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={studentRebuttal}
            onChange={e => setStudentRebuttal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSendRebuttal(); }}
            placeholder="Interupsi / Tambahkan argumen klarifikasi saudara ke Dewan Penguji..."
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            disabled={!studentRebuttal.trim()}
            onClick={handleSendRebuttal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 font-semibold text-xs transition-colors disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Klarifikasi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
