import React, { useState } from 'react';
import { ArrowRight, User, Settings2, ShieldCheck, HeartPulse } from 'lucide-react';

export default function Onboarding({ onComplete }: { onComplete: (data: any) => void }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({ name: '', need: '', style: '', privacy: false });

  const next = () => setStep(2);
  const finish = () => {
    const finalData = { ...data, onboarded: true };
    onComplete(finalData);
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center p-6 sm:p-8 animate-in fade-in duration-500">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img src="/favicon.svg" alt="RuangTenang Logo" className="w-20 h-20" />
          </div>
          <div className="font-bold text-3xl tracking-tight mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            <span className="text-teal-600">Ruang</span><span className="text-emerald-500">Tenang</span>
          </div>
          <p className="text-slate-500 mt-2">Mari sesuaikan asisten AI Anda.</p>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">Siapa nama panggilan Anda?</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  value={data.name}
                  onChange={e => setData({ ...data, name: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-teal-500 text-slate-800 text-lg"
                  placeholder="Nama Anda..."
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">Apa fokus utama Anda saat ini?</label>
              <div className="grid grid-cols-2 gap-2">
                {['Mengelola stres', 'Rutinitas', 'Cari Konselor', 'Teman Ngobrol'].map(need => (
                  <button
                    key={need}
                    onClick={() => setData({ ...data, need })}
                    className={`w-full p-3 text-sm text-center rounded-2xl border-2 transition-all ${data.need === need ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-100 hover:border-teal-200 text-slate-700'}`}
                  >
                    {need}
                  </button>
                ))}
              </div>
            </div>

            <button
              disabled={!data.name || !data.need}
              onClick={next}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              Lanjutkan <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">Gaya respons AI seperti apa yang Anda inginkan?</label>
              <div className="space-y-2">
                {[
                  { id: 'empathetic', title: 'Empatis & Hangat', desc: 'Cocok untuk curhat santai.' },
                  { id: 'structured', title: 'Terstruktur & Praktis', desc: 'Cocok untuk problem solving.' },
                ].map(style => (
                  <button
                    key={style.id}
                    onClick={() => setData({ ...data, style: style.id })}
                    className={`w-full p-3 text-left rounded-2xl border-2 transition-all flex items-start gap-3 ${data.style === style.id ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-100 hover:border-teal-200 text-slate-700'}`}
                  >
                    <Settings2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-sm">{style.title}</div>
                      <div className="text-xs opacity-80 mt-1">{style.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl space-y-3 text-sm text-slate-600 mt-6">
              <div className="flex gap-3 items-start">
                <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Privasi Anda Terlindungi</h3>
                  <p className="text-xs mt-1">Percakapan diproses secara privat. Kami tidak melatih model AI menggunakan chat pribadi Anda.</p>
                </div>
              </div>
            </div>
            
            <label className="flex items-start gap-3 cursor-pointer p-2">
              <input 
                type="checkbox" 
                checked={data.privacy}
                onChange={e => setData({ ...data, privacy: e.target.checked })}
                className="mt-0.5 w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 shrink-0" 
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                Saya mengerti AI bukan pengganti medis. Dalam keadaan darurat, saya akan menggunakan SOS.
              </span>
            </label>

            <button
              disabled={!data.style || !data.privacy}
              onClick={finish}
              className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold disabled:opacity-50 transition-colors shadow-lg shadow-teal-600/20"
            >
              Mulai Percakapan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
