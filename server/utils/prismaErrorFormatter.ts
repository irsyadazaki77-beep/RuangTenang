/**
 * Formats a Prisma P2002 Unique Constraint Violation error into a human-friendly, field-specific error message.
 * Extracts metadata from Prisma's `err.meta?.target` to deliver exact context to the end user.
 */
export function formatP2002ErrorMessage(err: any): { code: string; message: string; field?: string } {
  const target = err?.meta?.target;
  let targetStr = '';

  if (Array.isArray(target)) {
    targetStr = target.join(', ').toLowerCase();
  } else if (typeof target === 'string') {
    targetStr = target.toLowerCase();
  }

  if (targetStr.includes('email')) {
    return {
      code: 'DUPLICATE_EMAIL',
      message: 'Email sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.',
      field: 'email'
    };
  }

  if (targetStr.includes('nim') || targetStr.includes('studentnim')) {
    return {
      code: 'DUPLICATE_NIM',
      message: 'NIM ini sudah terdaftar dalam sistem.',
      field: 'studentNIM'
    };
  }

  if (
    targetStr.includes('slot') ||
    targetStr.includes('appointment') ||
    targetStr.includes('counselorid') ||
    targetStr.includes('date') ||
    targetStr.includes('time')
  ) {
    return {
      code: 'SLOT_ALREADY_BOOKED',
      message: 'Slot jadwal konseling pada tanggal dan waktu tersebut sudah terisi.',
      field: 'slot'
    };
  }

  if (targetStr) {
    return {
      code: 'DUPLICATE_ENTRY',
      message: `Data dengan ${targetStr} tersebut sudah terdaftar dalam sistem.`,
      field: targetStr
    };
  }

  return {
    code: 'DUPLICATE_ENTRY',
    message: 'Data dengan informasi tersebut sudah terdaftar dalam sistem.'
  };
}
