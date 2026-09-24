import { describe, it, expect } from 'vitest';
import { parseArtifactsFromText } from '../../features/workspace/utils/artifactParser';

describe('Workspace Artifacts & Multi-Version History', () => {
  it('correctly parses document and code artifacts from assistant messages', () => {
    const rawText = `Berikut adalah draf metodologi penelitian Anda:

<artifact type="document" title="Bab 3 Metodologi Penelitian">
# Bab 3: Metode Penelitian
Penelitian ini menggunakan pendekatan kuantitatif.
</artifact>

Dan berikut skrip simulasi datanya:
<artifact type="code" title="Data Generator" language="python">
import random
print([random.random() for _ in range(10)])
</artifact>
`;

    const { artifacts, cleanedText } = parseArtifactsFromText(rawText, false);

    expect(artifacts).toHaveLength(2);
    expect(artifacts[0].title).toBe('Bab 3 Metodologi Penelitian');
    expect(artifacts[0].type).toBe('DOCUMENT');
    expect(artifacts[0].content).toContain('# Bab 3: Metode Penelitian');

    expect(artifacts[1].title).toBe('Data Generator');
    expect(artifacts[1].type).toBe('CODE');
    expect(artifacts[1].language).toBe('python');
    expect(artifacts[1].content).toContain('import random');

    expect(cleanedText).not.toContain('<artifact');
  });

  it('handles incremental streaming artifact parsing without corruption', () => {
    const streamPart1 = `Sedang menyusun...\n<artifact type="document" title="Draf Skripsi">\n# Pendahuluan\nLatar belakang`;
    const { artifacts, activeStreamingArtifact } = parseArtifactsFromText(streamPart1, true);

    expect(activeStreamingArtifact).toBeDefined();
    expect(activeStreamingArtifact?.title).toBe('Draf Skripsi');
    expect(activeStreamingArtifact?.content.trim()).toBe('# Pendahuluan\nLatar belakang');
    expect(artifacts).toHaveLength(0); // in-progress unclosed tag
  });

  it('ignores example artifact tags inside markdown code blocks (code block immunity)', () => {
    const rawText = `Contoh sintaks XML adalah seperti ini:
\`\`\`xml
<artifact type="document" title="Contoh Tag">
Ini hanya contoh tag, bukan artefak sungguhan.
</artifact>
\`\`\`
Dan ini dokumen sungguhan:
<artifact type="document" title="Dokumen Nyata">
Konten dokumen sebenarnya.
</artifact>`;

    const { artifacts, cleanedText } = parseArtifactsFromText(rawText, false);

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].title).toBe('Dokumen Nyata');
    expect(artifacts[0].content).toBe('Konten dokumen sebenarnya.');
    expect(cleanedText).toContain('```xml');
    expect(cleanedText).toContain('Ini hanya contoh tag');
  });

  it('handles nested artifacts and code blocks inside artifact content', () => {
    const rawText = `<artifact type="document" title="Dokumen Kompleks">
# Induk Dokumen
Berikut contoh kode di dalam artefak:
\`\`\`html
<artifact type="code" title="Inner">contoh</artifact>
\`\`\`
Selesai isi dokumen.
</artifact>`;

    const { artifacts } = parseArtifactsFromText(rawText, false);

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].title).toBe('Dokumen Kompleks');
    expect(artifacts[0].content).toContain('# Induk Dokumen');
    expect(artifacts[0].content).toContain('<artifact type="code" title="Inner">contoh</artifact>');
    expect(artifacts[0].content).toContain('Selesai isi dokumen.');
  });

  it('gracefully recovers unclosed artifact on non-streaming cutoff', () => {
    const rawText = `Berikut drafnya:\n<artifact type="document" title="Draf Terpotong">\n# Bab 1\nParagraf yang terpotong tanpa tag penutup`;
    const { artifacts, cleanedText } = parseArtifactsFromText(rawText, false);

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].title).toBe('Draf Terpotong');
    expect(artifacts[0].content).toContain('# Bab 1');
    expect(cleanedText).not.toContain('<artifact');
    expect(cleanedText).toContain('Artefak Aktif');
  });

  it('correctly parses markdown directive artifact format :::artifact{...}', () => {
    const rawText = `Berikut draf latar belakang Bab 1 Anda:

:::artifact{type="markdown" title="Draf Latar Belakang Masalah (Bab 1)"}
# Bab 1: Pendahuluan
## 1.1 Latar Belakang
Kondisi ideal menunjukkan pentingnya efisiensi akademik.
:::

Silakan tinjau dan lakukan revisi di Canvas.`;

    const { artifacts, cleanedText } = parseArtifactsFromText(rawText, false);

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].title).toBe('Draf Latar Belakang Masalah (Bab 1)');
    expect(artifacts[0].type).toBe('DOCUMENT');
    expect(artifacts[0].language).toBe('markdown');
    expect(artifacts[0].content).toContain('# Bab 1: Pendahuluan');
    expect(artifacts[0].content).toContain('Kondisi ideal menunjukkan pentingnya efisiensi akademik.');
    expect(cleanedText).not.toContain(':::artifact');
    expect(cleanedText).toContain('Artefak Aktif (DOCUMENT)');
  });
});
