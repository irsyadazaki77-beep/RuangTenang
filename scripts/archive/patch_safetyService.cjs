const fs = require('fs');
let content = fs.readFileSync('server/services/ai/aiSafetyService.ts', 'utf-8');

content = content.replace(
  /getCrisisSafeResponse\(\): string \{\s*return `Saya mendengar betapa beratnya situasi[\s\S]*?kontak daruratmu\.`;\s*\}/,
  `getCrisisSafeResponse(): string {
    return \`Saya mendengar betapa beratnya situasi yang sedang kamu hadapi saat ini. Keselamatanmu adalah yang paling penting. Tolong jangan lewati ini sendirian. Mohon segera hubungi layanan darurat atau profesional yang bisa membantumu sekarang juga:

\${EMERGENCY_CONTACTS.map(c => \`- **\${c.name}:** \${c.phone}\`).join('\\n')}
- **Hubungi orang terdekat** atau pergi ke IGD rumah sakit terdekat.

Jika kamu merasa aman untuk sementara, tekan tombol SOS di aplikasi ini untuk menghubungi kontak daruratmu.\`;
  }`
);

fs.writeFileSync('server/services/ai/aiSafetyService.ts', content);
