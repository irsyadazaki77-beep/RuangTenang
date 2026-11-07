import { describe, it, expect } from 'vitest';
import { formatCode } from '../../features/coder/services/codeFormatter';

describe('RuangCoder Code Formatter', () => {
  it('formats JSON with clean 2-space indentation', () => {
    const raw = '{"name":"RuangCoder","version":1}';
    const formatted = formatCode(raw, 'package.json');
    expect(formatted).toContain('  "name": "RuangCoder"');
    expect(formatted).toContain('  "version": 1');
  });

  it('formats CSS rules and declarations with clean indentation', () => {
    const raw = 'body {background:#000;color:#fff;}';
    const formatted = formatCode(raw, 'styles.css');
    expect(formatted).toContain('  background: #000;');
    expect(formatted).toContain('  color: #fff;');
  });

  it('formats HTML tags with nested indentation', () => {
    const raw = '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello</h1></body></html>';
    const formatted = formatCode(raw, 'index.html');
    expect(formatted).toContain('<!DOCTYPE html>\n<html>\n  <head>\n    <title>Test</title>\n  </head>\n  <body>\n    <h1>Hello</h1>\n  </body>\n</html>');
  });

  it('formats JavaScript functions and blocks', () => {
    const raw = 'function test() {\nconst a = 1;\nconsole.log(a);\n}';
    const formatted = formatCode(raw, 'app.js');
    expect(formatted).toContain('function test() {');
    expect(formatted).toContain('  const a = 1;');
  });
});
