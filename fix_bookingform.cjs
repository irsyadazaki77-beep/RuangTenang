const fs = require('fs');
let text = fs.readFileSync('src/features/appointments/BookingForm.tsx', 'utf8');
text = text.replace(/useanys/g, 'useCounselors');
fs.writeFileSync('src/features/appointments/BookingForm.tsx', text);
