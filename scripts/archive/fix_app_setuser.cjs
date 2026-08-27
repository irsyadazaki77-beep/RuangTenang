const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(/const \{ user, loading, isOffline \} = useAuth\(\);/, 'const { user, setUser, loading, isOffline, logout } = useAuth();');

content = content.replace(/setUser\(DEFAULT_GUEST_USER\);/g, `setUser({
    id: 'guest',
    name: 'Mahasiswa / Tamu (Anonim)',
    email: 'anonim@kampus.ac.id',
    role: 'guest',
    tier: 'Free',
    usageStats: { chatMessagesSent: 0, appointmentsBooked: 0 }
  } as any);`);

content = content.replace(/DEFAULT_GUEST_USER/g, `({
    id: 'guest',
    name: 'Mahasiswa / Tamu (Anonim)',
    email: 'anonim@kampus.ac.id',
    role: 'guest',
    tier: 'Free',
    usageStats: { chatMessagesSent: 0, appointmentsBooked: 0 }
  } as any)`);
  
fs.writeFileSync('src/App.tsx', content);
