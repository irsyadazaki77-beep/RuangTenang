import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { LaptopContextService } from '../../services/agent/laptopContextService.js';

describe('LaptopContextService', () => {
  it('should extract valid path candidates from multi-line text', () => {
    const cwd = process.cwd();
    const input = `${cwd}\nrangkum berkas ini`;
    const candidates = LaptopContextService.extractLaptopPathCandidates(input);
    expect(candidates).toContain(cwd);
  });

  it('should find existing directory with trailing instruction words stripped', () => {
    const cwd = process.cwd();
    const input = `tolong periksa ${cwd} dan rangkum isinya`;
    const candidates = LaptopContextService.extractLaptopPathCandidates(input);
    expect(candidates).toContain(cwd);
  });

  it('should reject non-existent paths gracefully', async () => {
    const input = 'C:\\NonExistent_Fake_Folder_12345\\subfolder tolong baca';
    const res = await LaptopContextService.resolveLaptopLocalContext(input);
    expect(res.hasLaptopContext).toBe(false);
    expect(res.items.length).toBe(0);
  });

  it('should resolve and read files from existing directory', async () => {
    const testDir = path.resolve(process.cwd(), 'server/__tests__/fixtures');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    const testFile = path.join(testDir, 'sample_notes.txt');
    fs.writeFileSync(testFile, 'Catatan kuliah matematika diskrit: Logika proposisi dan tabel kebenaran.', 'utf-8');

    const res = await LaptopContextService.resolveLaptopLocalContext(`baca materi di ${testDir} ya`);
    expect(res.hasLaptopContext).toBe(true);
    expect(res.pathsFound.length).toBeGreaterThan(0);
    expect(res.contextBlock).toContain('<laptop_local_context');
    expect(res.contextBlock).toContain('sample_notes.txt');
    expect(res.contextBlock).toContain('Logika proposisi');

    // Clean up fixture file
    try { fs.unlinkSync(testFile); } catch {}
  });
});
