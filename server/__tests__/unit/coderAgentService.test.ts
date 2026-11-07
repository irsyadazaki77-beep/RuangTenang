import { describe, it, expect } from 'vitest';
import {
  applyResilientDiff,
  buildAgentSystemPrompt,
  buildLocalFileTree,
  detectRepetitionLoop,
  ensureCoderWorkspaceInitialized,
  executeCoderAgentTool,
  executeSafeShellCommand,
  getStarterFiles,
  isUserActionPrompt,
  listInstalledOllamaModels,
  parseFallbackToolCallsFromText,
  resolveSafeWorkspacePath,
  searchWorkspaceCode
} from '../../services/coder/coderAgentService.js';

describe('RuangCoder Autonomous Agent Service', () => {
  it('blocks path traversal outside local workspace root', () => {
    expect(() => resolveSafeWorkspacePath('../../etc/passwd')).toThrow(/Akses ditolak/i);
  });

  it('blocks access to sensitive configuration files (.env, server, prisma)', () => {
    expect(() => resolveSafeWorkspacePath('.env')).toThrow(/Akses ditolak: Akses ke file\/direktori sistem/i);
    expect(() => resolveSafeWorkspacePath('sub/.env.local')).toThrow(/Akses ditolak: Akses ke file\/direktori sistem/i);
    expect(() => resolveSafeWorkspacePath('prisma/schema.prisma')).toThrow(/Akses ditolak: Akses ke file\/direktori sistem/i);
    expect(() => resolveSafeWorkspacePath('server/routes/coder.ts')).toThrow(/Akses ditolak: Akses ke file\/direktori sistem/i);
  });

  it('blocks destructive shell commands in sandbox terminal', async () => {
    await expect(executeSafeShellCommand('rm -rf /')).rejects.toThrow(/ditolak oleh sistem keamanan/i);
    await expect(executeSafeShellCommand('cat ../../.env')).rejects.toThrow(/ditolak oleh sistem keamanan/i);
    await expect(executeSafeShellCommand('format c:')).rejects.toThrow(/ditolak oleh sistem keamanan/i);
  });

  it('initializes local disk workspace (Mode A) and reads file tree', async () => {
    const root = await ensureCoderWorkspaceInitialized();
    expect(root).toContain('coder-workspace');
    const tree = await buildLocalFileTree(root);
    expect(tree.some(n => n.name === 'index.html')).toBe(true);

    const readRes = await executeCoderAgentTool(
      { id: 'local_1', name: 'read_file', arguments: { path: 'utils.js' } },
      'local',
      {}
    );
    expect(readRes.status).toBe('completed');
    expect(readRes.output).toContain('calculateStats');
  });

  it('discovers installed local Ollama models', async () => {
    const inventory = await listInstalledOllamaModels();
    expect(typeof inventory.reachable).toBe('boolean');
    expect(Array.isArray(inventory.models)).toBe(true);
  });

  it('executes list_files, read_file, write_file, edit_file_diff, search_code in Browser Sandbox mode (Mode B)', async () => {
    const virtualFiles = getStarterFiles();

    const listRes = await executeCoderAgentTool(
      { id: '1', name: 'list_files', arguments: {} },
      'browser',
      virtualFiles
    );
    expect(listRes.status).toBe('completed');
    expect(listRes.output).toContain('index.html');

    const writeRes = await executeCoderAgentTool(
      {
        id: '2',
        name: 'write_file',
        arguments: { path: 'hello.js', content: 'const msg = "Halo RuangCoder";\nconsole.log(msg);' }
      },
      'browser',
      virtualFiles
    );
    expect(writeRes.status).toBe('completed');
    expect(virtualFiles['hello.js']).toContain('Halo RuangCoder');

    const diffRes = await executeCoderAgentTool(
      {
        id: '3',
        name: 'edit_file_diff',
        arguments: {
          path: 'hello.js',
          target: 'Halo RuangCoder',
          replacement: 'Halo Local AI Agent'
        }
      },
      'browser',
      virtualFiles
    );
    expect(diffRes.status).toBe('completed');
    expect(virtualFiles['hello.js']).toContain('Halo Local AI Agent');

    const searchRes = await executeCoderAgentTool(
      {
        id: '4',
        name: 'search_code',
        arguments: { query: 'Local AI Agent' }
      },
      'browser',
      virtualFiles
    );
    expect(searchRes.status).toBe('completed');
    expect(searchRes.output).toContain('hello.js:1:');
  });

  it('resiliently patches diffs with CRLF vs LF and trailing whitespace differences', () => {
    // 1. CRLF original vs LF target
    const crlfSource = 'function test() {\r\n  console.log("hello");\r\n  return true;\r\n}';
    const lfTarget = '  console.log("hello");\n  return true;';
    const lfReplacement = '  console.log("world");\n  return false;';

    const patched = applyResilientDiff(crlfSource, lfTarget, lfReplacement, 'test.js');
    expect(patched).toContain('console.log("world");');
    expect(patched).toContain('return false;');
    expect(patched).toContain('\r\n');

    // 2. Trailing spaces variance
    const trailingSource = 'const a = 10;   \nconst b = 20;\n';
    const cleanTarget = 'const a = 10;\nconst b = 20;';
    const newReplacement = 'const a = 100;\nconst b = 200;';

    const patched2 = applyResilientDiff(trailingSource, cleanTarget, newReplacement, 'test.js');
    expect(patched2).toContain('const a = 100;');
    expect(patched2).toContain('const b = 200;');
  });

  it('searches workspace code across local files', async () => {
    await ensureCoderWorkspaceInitialized();
    const results = await searchWorkspaceCode('calculateStats');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.file.includes('utils.js'))).toBe(true);
  });

  it('correctly discriminates actionable requests from informational queries with isUserActionPrompt', () => {
    expect(isUserActionPrompt('buatkan antarmuka tugas sederhana')).toBe(true);
    expect(isUserActionPrompt('tambahkan tombol delete pada counter')).toBe(true);
    expect(isUserActionPrompt('bikin to do list dengan html dan css')).toBe(true);
    expect(isUserActionPrompt('perbaiki error TypeError di app.js')).toBe(true);
    expect(isUserActionPrompt('ubah styling background jadi warna hitam')).toBe(true);

    expect(isUserActionPrompt('apa itu async await dalam javascript?')).toBe(false);
    expect(isUserActionPrompt('bagaimana cara kerja css flexbox?')).toBe(false);
    expect(isUserActionPrompt('jelaskan alur fungsi calculateStats')).toBe(false);

    expect(isUserActionPrompt('kenapa fungsi ini return undefined dan tolong perbaiki')).toBe(true);
  });

  it('extracts native <tool_call>, json, and auto-synthesizes write_file from markdown code blocks', () => {
    // 1. Native <tool_call>
    const xmlText = '<tool_call>{"name": "read_file", "arguments": {"path": "index.html"}}</tool_call>';
    const parsed1 = parseFallbackToolCallsFromText(xmlText);
    expect(parsed1.toolCalls).toHaveLength(1);
    expect(parsed1.toolCalls[0].name).toBe('read_file');
    expect(parsed1.toolCalls[0].arguments.path).toBe('index.html');

    // 2. JSON block tool call
    const jsonText = '```json\n{"name": "write_file", "arguments": {"path": "app.js", "content": "console.log(1);"}}\n```';
    const parsed2 = parseFallbackToolCallsFromText(jsonText);
    expect(parsed2.toolCalls).toHaveLength(1);
    expect(parsed2.toolCalls[0].name).toBe('write_file');
    expect(parsed2.toolCalls[0].arguments.path).toBe('app.js');

    // 3. Raw markdown code block with language hint (html -> index.html) when isActionPrompt is true
    const rawHtml = 'Berikut kodenya:\n```html\n<!DOCTYPE html>\n<html><body><h1>Tugas</h1></body></html>\n```';
    const parsed3 = parseFallbackToolCallsFromText(rawHtml, { isActionPrompt: true });
    expect(parsed3.toolCalls).toHaveLength(1);
    expect(parsed3.toolCalls[0].name).toBe('write_file');
    expect(parsed3.toolCalls[0].arguments.path).toBe('index.html');
    expect(parsed3.toolCalls[0].arguments.content).toContain('<h1>Tugas</h1>');

    // 4. Raw markdown code block with explicit file mention in text
    const explicitMention = 'Simpan perubahan ke file `styles.css`:\n```css\n.task-item { display: flex; color: red; }\n```';
    const parsed4 = parseFallbackToolCallsFromText(explicitMention, { isActionPrompt: true });
    expect(parsed4.toolCalls).toHaveLength(1);
    expect(parsed4.toolCalls[0].name).toBe('write_file');
    expect(parsed4.toolCalls[0].arguments.path).toBe('styles.css');

    // 5. Does NOT synthesize write_file if isActionPrompt is false (informational question)
    const infoText = 'Contoh penggunaan flexbox:\n```html\n<div style="display: flex;"><span>Item</span></div>\n```';
    const parsed5 = parseFallbackToolCallsFromText(infoText, { isActionPrompt: false });
    expect(parsed5.toolCalls).toHaveLength(0);
  });

  it('buildAgentSystemPrompt enforces strict action-first autonomous directives like Antigravity', () => {
    const prompt = buildAgentSystemPrompt('browser', 'index.html', 'creative');
    expect(prompt).toContain('ACTION-FIRST & OTONOM PENUH');
    expect(prompt).toContain('DILARANG KERAS menanyakan izin');
    expect(prompt).toContain('DILARANG KERAS memberikan langkah-langkah manual');
    expect(prompt).toContain('write_file');
    expect(prompt).toContain('edit_file_diff');
  });

  it('detectRepetitionLoop detects degenerate repetition loops and cuts off duplicate content', () => {
    // 1. Multi-line repeating block (identical to the user screenshot issue)
    const loopingText = `Berikut alternatif yang bisa dicoba:
Jika tidak berhasil, kita bisa:
- Coba dengan menggunakan framework Flask.
- Coba dengan menggunakan framework FastAPI.
- Coba dengan menggunakan framework Pydantic.
- Coba dengan menggunakan framework OpenAI.

Jika tidak berhasil, kita bisa:
- Coba dengan menggunakan framework Flask.
- Coba dengan menggunakan framework FastAPI.
- Coba dengan menggunakan framework Pydantic.
- Coba dengan menggunakan framework OpenAI.`;

    const res = detectRepetitionLoop(loopingText);
    expect(res.isLoop).toBe(true);
    expect(res.cleanedText).toContain('Berikut alternatif yang bisa dicoba:');
    // Ensure the cut off removed the second repeated block
    const occurrences = res.cleanedText.split('Coba dengan menggunakan framework Flask.').length - 1;
    expect(occurrences).toBe(1);

    // 2. Single line repeated 3+ times
    const singleLineLoop = `Logika perhitungan:
const total = a + b;
const total = a + b;
const total = a + b;`;
    const res2 = detectRepetitionLoop(singleLineLoop);
    expect(res2.isLoop).toBe(true);

    // 3. Normal diverse text does not trigger false positive
    const normalText = `Langkah 1: Buat file index.html dengan template HTML5.
Langkah 2: Tambahkan komponen counter dan tombol di dalam elemen main.
Langkah 3: Terapkan styling CSS dengan flexbox dan border-radius modern.
Langkah 4: Tambahkan event listener di app.js untuk menangani klik tombol.`;
    const res3 = detectRepetitionLoop(normalText);
    expect(res3.isLoop).toBe(false);
    expect(res3.cleanedText).toBe(normalText);
  });
});
