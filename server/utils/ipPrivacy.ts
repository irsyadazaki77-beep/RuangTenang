import crypto from 'crypto';

export function maskIpAddress(ip: string): string {
  const value = ip.trim().replace(/^::ffff:/i, '');
  if (/^\d{1,3}(?:\.\d{1,3}){2}\.xxx$/i.test(value) || /^[0-9a-f:]+::$/i.test(value)) return value;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) return `${value.split('.').slice(0, 3).join('.')}.xxx`;
  if (value.includes(':')) return `${value.split(':').slice(0, 4).join(':')}::`;
  return 'unknown';
}

export function hashIpAddress(ip: string): string | null {
  const key = process.env.IP_HASH_KEY || process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET;
  return key ? crypto.createHmac('sha256', key).update(ip.trim().toLowerCase()).digest('hex') : null;
}
