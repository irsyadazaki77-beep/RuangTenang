/**
 * Flowchart Generator Service for Ruang Coder
 * Menganalisis kode dan menghasilkan sintaks Mermaid Flowchart untuk visualisasi alur logika & responsi sidang.
 */

export function generateCodeFlowchart(code: string, _filename = 'code.js'): string {
  if (!code || !code.trim()) {
    return `flowchart TD\n  Start([Mulai]) --> Empty[Berkas Kosong] --> End([Selesai])`;
  }

  const lines = code.split(/\r?\n/);
  const steps: string[] = ['flowchart TD', '  Start([Mulai Eksekusi])'];
  let prevNode = 'Start';
  let nodeCount = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.startsWith('//') || rawLine.startsWith('#') || rawLine.startsWith('/*')) {
      continue;
    }

    // Function declaration
    const fnMatch = /(?:function|def|const)\s+([a-zA-Z0-9_]+)/.exec(rawLine);
    if (fnMatch) {
      const nodeName = `fn_${nodeCount++}`;
      steps.push(`  ${prevNode} --> ${nodeName}["Fungsi: ${fnMatch[1]}()"]`);
      prevNode = nodeName;
      continue;
    }

    // Conditional If
    const ifMatch = /\bif\s*\((.*?)\)|\bif\s+(.*?):/.exec(rawLine);
    if (ifMatch) {
      const cond = (ifMatch[1] || ifMatch[2] || 'kondisi').replace(/["'{}()]/g, '').trim().slice(0, 30);
      const nodeName = `cond_${nodeCount++}`;
      steps.push(`  ${prevNode} --> ${nodeName}{"${cond}?"}`);
      prevNode = nodeName;
      continue;
    }

    // Loops (for / while)
    const loopMatch = /\b(for|while)\s*\(|\b(for|while)\s+/.exec(rawLine);
    if (loopMatch) {
      const nodeName = `loop_${nodeCount++}`;
      steps.push(`  ${prevNode} --> ${nodeName}["Perulangan: ${loopMatch[1] || loopMatch[2]}"]`);
      prevNode = nodeName;
      continue;
    }

    // Return statement
    if (rawLine.startsWith('return ') || rawLine === 'return;') {
      const retVal = rawLine.replace('return', '').replace(';', '').trim().slice(0, 25) || 'nilai';
      const nodeName = `ret_${nodeCount++}`;
      steps.push(`  ${prevNode} --> ${nodeName}["Return: ${retVal}"]`);
      prevNode = nodeName;
      continue;
    }
  }

  steps.push(`  ${prevNode} --> Finish([Selesai])`);
  return steps.join('\n');
}
