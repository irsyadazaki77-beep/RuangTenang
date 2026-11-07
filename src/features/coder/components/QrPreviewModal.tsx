import React from 'react';
import { QrCode, Smartphone, X } from 'lucide-react';

interface QrPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string;
}

export const QrPreviewModal: React.FC<QrPreviewModalProps> = ({
  isOpen,
  onClose,
  previewUrl
}) => {
  if (!isOpen) return null;

  // Generate QR Code image url using Google Charts API / QuickChart
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    previewUrl
  )}&bgcolor=0f172a&color=2dd4bf&margin=10`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col p-6 text-center">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-left">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Live Mobile Preview</h3>
              <p className="text-[11px] text-slate-400">Scan via kamera ponsel Anda</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="my-5 flex flex-col items-center justify-center p-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
          <img
            src={qrImageSrc}
            alt="RuangCoder Live QR Code"
            className="w-48 h-48 rounded-xl object-contain shadow-md"
          />
          <span className="text-[10px] text-slate-500 mt-3 font-mono break-all px-2">
            {previewUrl}
          </span>
        </div>

        {/* Instruction Note */}
        <div className="flex items-start gap-2.5 text-left p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-300 mb-4">
          <Smartphone className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <span className="text-[11px] leading-relaxed">
            Pastikan smartphone dan laptop terhubung ke jaringan Wi-Fi yang sama untuk melihat preview langsung di HP.
          </span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
