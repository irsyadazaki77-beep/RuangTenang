sed -i 's/Lock,//g' src/features/counselors/CounselorDirectory.tsx
sed -i 's/const { counselors, loading, error } = useCounselors();/const { counselors } = useCounselors();/g' src/features/counselors/CounselorDirectory.tsx
sed -i '/const \[scheduleFilter, setScheduleFilter\] = useState/d' src/features/counselors/CounselorDirectory.tsx
sed -i '/"Semua" | "Hari Ini" | "Minggu Ini"/d' src/features/counselors/CounselorDirectory.tsx
sed -i '/>(\"Semua\");/d' src/features/counselors/CounselorDirectory.tsx
