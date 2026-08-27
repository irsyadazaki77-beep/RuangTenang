const fs = require('fs');
let content = fs.readFileSync('src/components/EmergencyCenter.tsx', 'utf-8');

if (!content.includes('import { EMERGENCY_CONTACTS }')) {
  content = content.replace(
    /import \{ useEscapeKey \} from '\.\.\/hooks\/useEscapeKey';/,
    `import { useEscapeKey } from '../hooks/useEscapeKey';\nimport { EMERGENCY_CONTACTS } from '../lib/emergencyResources';`
  );
}

// Replace the primary hotline button with the first resource
content = content.replace(
  /\{.*?ACTION CARD 1: DIRECT HOTLINE DIAL.*?\}[\s\S]*?<\/a>/,
  `{/* ACTION CARD 1: DIRECT HOTLINE DIAL */}
            <div className="bg-white border border-rose-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute inset-0 bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 flex flex-col gap-3">
                <div>
                  <h3 className="font-semibold text-rose-950 flex items-center gap-1.5">
                    {EMERGENCY_CONTACTS[0].name}
                  </h3>
                  <p className="text-xs text-rose-700/80 mt-0.5">{EMERGENCY_CONTACTS[0].description}</p>
                </div>
                <a
                  href={EMERGENCY_CONTACTS[0].url}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-lg hover:bg-rose-700 active:scale-95 transition-all shadow-sm"
                >
                  <Phone className="w-4 h-4" />
                  <span>Telepon {EMERGENCY_CONTACTS[0].phone}</span>
                </a>
              </div>
            </div>`
);

content = content.replace(
  /"Koneksi luring\. Silakan lakukan panggilan telepon seluler langsung ke nomor 119 Ext 8\.",/g,
  `"Koneksi luring. Silakan lakukan panggilan telepon seluler langsung ke nomor " + EMERGENCY_CONTACTS[0].phone + ".",`
);
content = content.replace(
  /"Tidak dapat terhubung ke server\. Hubungi nomor 119 Ext 8 secara langsung\.",/g,
  `"Tidak dapat terhubung ke server. Hubungi nomor " + EMERGENCY_CONTACTS[0].phone + " secara langsung.",`
);

fs.writeFileSync('src/components/EmergencyCenter.tsx', content);
