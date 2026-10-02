import { describe, expect, it } from 'vitest';
import { hashIpAddress, maskIpAddress } from '../../utils/ipPrivacy.js';

describe('privacy-safe IP security history', () => {
  it('masks addresses for history display while preserving keyed correlation', () => {
    const previous = process.env.IP_HASH_KEY;
    process.env.IP_HASH_KEY = 'fixture-ip-hash-secret';
    try {
      expect(maskIpAddress('103.122.44.15')).toBe('103.122.44.xxx');
      expect(maskIpAddress('2001:db8:abcd:0012:0000:0000:0000:0001')).toBe('2001:db8:abcd:0012::');
      expect(hashIpAddress('103.122.44.15')).toBe(hashIpAddress('103.122.44.15'));
      expect(hashIpAddress('103.122.44.15')).not.toBe(hashIpAddress('103.122.44.16'));
    } finally {
      if (previous === undefined) delete process.env.IP_HASH_KEY;
      else process.env.IP_HASH_KEY = previous;
    }
  });
});
