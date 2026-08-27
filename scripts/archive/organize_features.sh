#!/bin/bash
mkdir -p src/features/{settings,authentication,screening,mood,counselors,appointments,privacy,memory}

# Move components
mv src/components/SettingsPage.tsx src/features/settings/ || true
mv src/components/auth src/features/authentication/ || true
mv src/components/AuthModal.tsx src/features/authentication/ || true
mv src/components/ScreeningModal.tsx src/features/screening/ || true
mv src/components/CounselorDirectory.tsx src/features/counselors/ || true
mv src/components/CounselorDashboard.tsx src/features/counselors/ || true
mv src/components/appointment/* src/features/appointments/ || true
rmdir src/components/appointment || true
mv src/components/AppointmentScheduler.tsx src/features/appointments/ || true
mv src/components/PrivacyCenterModal.tsx src/features/privacy/ || true
mv src/components/LegalDocsModal.tsx src/features/privacy/ || true

# UserProgressTracker.tsx uses MoodTracker, etc. Move progress folder.
mv src/components/progress/* src/features/mood/ || true
rmdir src/components/progress || true
mv src/components/UserProgressTracker.tsx src/features/mood/ || true

echo "Move done. Import fixing is complex, let's see..."
