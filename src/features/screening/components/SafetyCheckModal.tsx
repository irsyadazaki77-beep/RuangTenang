import React from 'react';
import { ShieldAlert, PhoneCall, Phone } from 'lucide-react';
import { EMERGENCY_CONTACTS } from '../../../lib/emergencyResources';

interface SafetyCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  safetyAssessment: {
    immediateDanger: boolean | null;
    planOrIntent: boolean | null;
    wantsTrustedContact: boolean | null;
  };
  setSafetyAssessment: React.Dispatch<React.SetStateAction<{
    immediateDanger: boolean | null;
    planOrIntent: boolean | null;
    wantsTrustedContact: boolean | null;
  }>>;
}

export const SafetyCheckModal: React.FC<SafetyCheckModalProps> = ({
  isOpen,
  onClose,
  safetyAssessment,
  setSafetyAssessment,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 border border-rose-300 text-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-5">
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-950">
          <ShieldAlert className="w-7 h-7 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-base text-rose-900">Prosedur Keselamatan (Safety Check)</h3>
            <p className="text-xs text-rose-800 leading-relaxed mt-1">
              Jawaban pada pertanyaan ke-9 menunjukkan adanya pikiran menyakiti diri. Keselamatan dan kesehatan emosionalmu adalah prioritas utama kami.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Penilaian Risiko Keselamatan Langsung</h4>

          {/* Question 1: Immediate Danger */}
          <div className="p-3.5 bg-slate-50 rounded-xl space-y-2">
            <p className="text-xs font-medium text-slate-900">1. Apakah kamu saat ini berada dalam bahaya langsung?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setSafetyAssessment(prev => ({ ...prev, immediateDanger: true }))}
                className={`flex-1 py-1.5 px-3 min-h-[44px] rounded-lg text-xs font-medium border transition-all active:scale-95 ${
                  safetyAssessment.immediateDanger === true
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white dark:bg-slate-800 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Ya, Saya Dalam Bahaya
              </button>
              <button
                onClick={() => setSafetyAssessment(prev => ({ ...prev, immediateDanger: false }))}
                className={`flex-1 py-1.5 px-3 min-h-[44px] rounded-lg text-xs font-medium border transition-all active:scale-95 ${
                  safetyAssessment.immediateDanger === false
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-white dark:bg-slate-800 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Tidak Saat Ini
              </button>
            </div>
          </div>

          {/* Question 2: Plan/Access/Intent */}
          <div className="p-3.5 bg-slate-50 rounded-xl space-y-2">
            <p className="text-xs font-medium text-slate-900">2. Apakah ada rencana spesifik, akses terhadap alat membahayakan, atau niat segera?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setSafetyAssessment(prev => ({ ...prev, planOrIntent: true }))}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-all ${
                  safetyAssessment.planOrIntent === true
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white dark:bg-slate-800 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Ya, Ada Rencana/Niat
              </button>
              <button
                onClick={() => setSafetyAssessment(prev => ({ ...prev, planOrIntent: false }))}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-all ${
                  safetyAssessment.planOrIntent === false
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-white dark:bg-slate-800 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Tidak Ada Rencana/Niat
              </button>
            </div>
          </div>

          {/* Question 3: Trusted Contact */}
          <div className="p-3.5 bg-slate-50 rounded-xl space-y-2">
            <p className="text-xs font-medium text-slate-900">3. Apakah kamu ingin bantuan menghubungi orang tepercaya (keluarga/sahabat)?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setSafetyAssessment(prev => ({ ...prev, wantsTrustedContact: true }))}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-all ${
                  safetyAssessment.wantsTrustedContact === true
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white dark:bg-slate-800 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Ya, Tampilkan Bantuan Kontak
              </button>
              <button
                onClick={() => setSafetyAssessment(prev => ({ ...prev, wantsTrustedContact: false }))}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-all ${
                  safetyAssessment.wantsTrustedContact === false
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white dark:bg-slate-800 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Nanti Saja
              </button>
            </div>
          </div>

          {/* Direct Emergency Contact Panel */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-2 font-medium text-amber-900 text-xs">
              <PhoneCall className="w-4 h-4 text-amber-600" />
              <span>Kontak Bantuan Krisis Cepat (Aktif 24 Jam):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {EMERGENCY_CONTACTS.slice(0, 2).map((contact) => (
                <a
                  key={contact.id}
                  href={contact.url}
                  className="p-2.5 bg-white dark:bg-slate-800 border border-amber-300 rounded-lg flex items-center justify-between hover:bg-amber-100/50 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{contact.name}</p>
                    <p className="text-[10px] text-slate-500">{contact.type}</p>
                  </div>
                  <span className="font-bold text-rose-600 text-sm">{contact.phone}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <a
            href="tel:119"
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Hubungi Hotline 119</span>
          </a>
          <button
            onClick={onClose}
            className="px-5 py-2 min-h-[44px] bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg transition-all active:scale-95"
          >
            Saya Aman, Lanjutkan Skrining
          </button>
        </div>
      </div>
    </div>
  );
};
