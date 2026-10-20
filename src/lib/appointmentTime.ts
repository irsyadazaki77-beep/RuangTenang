export type AppointmentTimezone = 'WIB' | 'WITA' | 'WIT';

const APPOINTMENT_IANA_TIMEZONES: Record<AppointmentTimezone, string> = {
  WIB: 'Asia/Jakarta',
  WITA: 'Asia/Makassar',
  WIT: 'Asia/Jayapura'
};

/** Return YYYY-MM-DD for an HTML date input in the selected appointment timezone. */
export function getAppointmentDateInputValue(date: Date, timezone: AppointmentTimezone): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: APPOINTMENT_IANA_TIMEZONES[timezone],
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }
}
