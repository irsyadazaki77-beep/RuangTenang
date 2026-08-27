const fs = require('fs');
let content = fs.readFileSync('src/components/EmergencyCenter.tsx', 'utf-8');

const regex = /\{\/\* ACTION CARD 1: DIRECT HOTLINE DIAL \*\/\}.*?\{\/\* ACTION CARD 2: INSTANT SOS SIGNAL \*\/\}/s;

const replacement = `{/* ACTION CARD 1: DIRECT HOTLINE DIAL */}
        <div className="bg-gradient-to-br from-rose-50 to-white rounded-2xl p-5 sm:p-6 shadow-xs border border-rose-100 flex flex-col justify-between space-y-5">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold uppercase tracking-wider">
              <PhoneCall className="w-3.5 h-3.5 text-rose-600" /> Kontak Langsung 24/7
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              {EMERGENCY_CONTACTS[0].name}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {EMERGENCY_CONTACTS[0].description}
            </p>
          </div>
          <a
            href={EMERGENCY_CONTACTS[0].url}
            className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-rose-500/30"
          >
            <Phone className="w-5 h-5" />
            <span>Telepon {EMERGENCY_CONTACTS[0].phone}</span>
          </a>
        </div>

        {/* ACTION CARD 2: INSTANT SOS SIGNAL */}`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/EmergencyCenter.tsx', content);
