const fs = require('fs');
let code = fs.readFileSync('src/features/privacy/PrivacyCenterModal.tsx', 'utf8');
code = code.replace(
  "  const [activeTab, setActiveTab] = useState<\n  const [showMobileDetail, setShowMobileDetail] = useState(false);\n    'consent' | 'export' | 'correct' | 'retention' | 'sessions' | 'access_logs' | 'erasure'\n  >('consent');",
  "  const [showMobileDetail, setShowMobileDetail] = useState(false);\n  const [activeTab, setActiveTab] = useState<\n    'consent' | 'export' | 'correct' | 'retention' | 'sessions' | 'access_logs' | 'erasure'\n  >('consent');"
);
fs.writeFileSync('src/features/privacy/PrivacyCenterModal.tsx', code);
