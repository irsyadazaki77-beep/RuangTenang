import { describe, it, expect } from 'vitest';
import { peerPairProgrammingService } from '../../features/coder/services/peerPairProgramming';

describe('peerPairProgrammingService', () => {
  it('creates collaboration room with valid code prefix', () => {
    const code = peerPairProgrammingService.createRoom('Budi');
    expect(code).toMatch(/^RC-[A-Z0-9]+$/);
    const state = peerPairProgrammingService.getState();
    expect(state.roomCode).toBe(code);
    expect(state.myRole).toBe('driver');
  });

  it('allows adding peer review annotations and resolving them', () => {
    const annot = peerPairProgrammingService.addAnnotation({
      filePath: 'src/app.js',
      lineNumber: 14,
      author: 'Asisten Lab',
      authorRole: 'asisten_lab',
      comment: 'Validasi input kosong di awal fungsi.',
      category: 'saran_perbaikan'
    });

    expect(annot.id).toBeDefined();
    expect(annot.resolved).toBe(false);

    let state = peerPairProgrammingService.getState();
    expect(state.annotations.some(a => a.id === annot.id)).toBe(true);

    peerPairProgrammingService.resolveAnnotation(annot.id);
    state = peerPairProgrammingService.getState();
    const resolvedAnnot = state.annotations.find(a => a.id === annot.id);
    expect(resolvedAnnot?.resolved).toBe(true);
  });

  it('generates markdown Lab Asistensi card with table of comments', () => {
    const cardMd = peerPairProgrammingService.generateLabAsistensiCard('Modul 3 Basis Data');
    expect(cardMd).toContain('# KARTU ASISTENSI & PEER-REVIEW PRAKTIKUM');
    expect(cardMd).toContain('Modul 3 Basis Data');
    expect(cardMd).toContain('Ringkasan Catatan Peer Reviewer');
  });
});
