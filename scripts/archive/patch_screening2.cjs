const fs = require('fs');
let content = fs.readFileSync('src/features/screening/ScreeningModal.tsx', 'utf-8');

if (!content.includes('import { EMERGENCY_CONTACTS }')) {
  content = content.replace(
    /import \{ getPhq9Severity, getGad7Severity, CLINICAL_DISCLAIMER \} from '\.\.\/\.\.\/lib\/clinicalScoring';/,
    `import { getPhq9Severity, getGad7Severity, CLINICAL_DISCLAIMER } from '../../lib/clinicalScoring';\nimport { EMERGENCY_CONTACTS } from '../../lib/emergencyResources';`
  );
}

// Replace the hardcoded emergency contacts panel
const hardcodedPanel = `<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <a
                      href="tel:119"
                      className="p-2.5 bg-white border border-amber-300 rounded-lg flex items-center justify-between hover:bg-amber-100/50 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">Kemenkes Sejiwa</p>
                        <p className="text-[10px] text-slate-500">Layanan Psikologi Krisis</p>
                      </div>
                      <span className="font-bold text-rose-600 text-sm">119 ext 8</span>
                    </a>
                    <a
                      href="tel:08112222999"
                      className="p-2.5 bg-white border border-amber-300 rounded-lg flex items-center justify-between hover:bg-amber-100/50 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">Hotline Kampus</p>
                        <p className="text-[10px] text-slate-500">Tim Pendampingan 24 Jam</p>
                      </div>
                      <span className="font-bold text-teal-700 text-xs">0811-2222-999</span>
                    </a>
                  </div>`;

const newPanel = `<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {EMERGENCY_CONTACTS.slice(0, 2).map((contact) => (
                      <a
                        key={contact.id}
                        href={contact.url}
                        className="p-2.5 bg-white border border-amber-300 rounded-lg flex items-center justify-between hover:bg-amber-100/50 transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{contact.name}</p>
                          <p className="text-[10px] text-slate-500">{contact.type}</p>
                        </div>
                        <span className="font-bold text-rose-600 text-sm">{contact.phone}</span>
                      </a>
                    ))}
                  </div>`;

content = content.replace(hardcodedPanel, newPanel);
fs.writeFileSync('src/features/screening/ScreeningModal.tsx', content);
