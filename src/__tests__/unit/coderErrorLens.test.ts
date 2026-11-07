import { describe, it, expect } from 'vitest';
import { parseErrorLocation } from '../../features/coder/components/ErrorLensActionBanner';

describe('ErrorLensActionBanner - Stack Trace Parsing', () => {
  it('parses JavaScript Node.js stack traces accurately', () => {
    const errorText = `TypeError: Cannot read properties of undefined (reading 'split')
    at calculateStats (utils.js:14:5)
    at Object.<anonymous> (test.js:8:3)`;

    const loc = parseErrorLocation(errorText);
    expect(loc).not.toBeNull();
    expect(loc?.file).toBe('utils.js');
    expect(loc?.line).toBe(14);
    expect(loc?.col).toBe(5);
  });

  it('parses Python traceback line numbers accurately', () => {
    const pythonError = `Traceback (most recent call last):
  File "main.py", line 42, in <module>
    result = compute_matrix(None)
ValueError: Matrix cannot be empty`;

    const loc = parseErrorLocation(pythonError);
    expect(loc).not.toBeNull();
    expect(loc?.file).toBe('main.py');
    expect(loc?.line).toBe(42);
  });

  it('returns null when no file or line location is present', () => {
    const genericError = 'Command failed with exit code 1';
    const loc = parseErrorLocation(genericError);
    expect(loc).toBeNull();
  });
});
