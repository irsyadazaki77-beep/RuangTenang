const fs = require('fs');
let content = fs.readFileSync('src/components/AiCounselorDisclaimerBadge.tsx', 'utf-8');

content = content.replace(/badge="Standar Medis"/g, 'badge="UNVERIFIED"');
content = content.replace(/Sistem ini beroperasi di bawah protokol keselamatan medis dan panduan PFA \(Psychological First Aid\)\./g, 'Sistem ini merupakan AI pendamping dan bukan pengganti diagnosis klinis. Harap hubungi profesional kesehatan mental untuk bantuan medis.');
content = content.replace(/Diawasi oleh tim klinis dan psikolog kampus/g, 'Belum melalui tinjauan klinis, digunakan untuk eksperimen/demonstrasi.');

fs.writeFileSync('src/components/AiCounselorDisclaimerBadge.tsx', content);
