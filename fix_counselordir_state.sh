sed -i '/const \[searchQuery, setSearchQuery\] = useState("");/a\
  const [selectedConcern, setSelectedConcern] = useState<string>("Semua");\
  const [methodFilter, setMethodFilter] = useState<string>("Semua");\
  const [costFilter, setCostFilter] = useState<string>("Semua");\
  const [campusFilter, setCampusFilter] = useState<string>("Semua");\
  const [languageFilter, setLanguageFilter] = useState<string>("Semua");\
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("Semua");' src/features/counselors/CounselorDirectory.tsx
