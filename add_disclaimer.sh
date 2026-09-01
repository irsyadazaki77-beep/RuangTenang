sed -i '/<div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-100">/i\
            <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-4 mt-4 mb-4">\
              <p className="text-sm text-amber-800 text-center font-medium">\
                ⚠️ Skor ini hanya alat skrining awal, bukan diagnosis medis.\
              </p>\
            </div>\
' src/features/screening/ScreeningModal.tsx
