import { describe, it, expect, beforeEach } from 'vitest';
import { BUILT_IN_PRESETS, DEFAULT_PRESET_ID, getBuiltInPresetById } from '../../features/workspace/constants/presetConstants';
import {
  validateCustomPreset,
  loadUserCustomPresets,
  saveUserCustomPresets,
  loadUserPersonalization,
  saveUserPersonalization,
  getPresetSummary,
  buildPresetRequestSnapshot
} from '../../features/workspace/utils/workspacePresetManager';
import { safeLocalStorage } from '../../lib/storage';
import { WorkspaceAiPreset } from '../../lib/aiPresets';

describe('FASE 21 — Workspace Presets & Personalization Domain Tests', () => {
  beforeEach(() => {
    safeLocalStorage.clear();
  });

  describe('1. Built-in Presets Definition & Completeness', () => {
    it('defines exactly the 6 required built-in presets', () => {
      const ids = BUILT_IN_PRESETS.map(p => p.id);
      expect(ids).toEqual(['cepat', 'seimbang', 'mendalam', 'akademik', 'coding', 'research']);
    });

    it('has valid structure and required fields for all built-in presets', () => {
      for (const preset of BUILT_IN_PRESETS) {
        expect(preset.id).toBeTruthy();
        expect(preset.name).toBeTruthy();
        expect(preset.description).toBeTruthy();
        expect(preset.scope).toBe('builtin');
        expect(preset.routingMode).toBe('auto');
        expect(preset.capabilities).toContain('chat');
        expect(preset.capabilities).toContain('streaming');
      }
    });

    it('retrieves built-in preset by ID correctly', () => {
      const cepat = getBuiltInPresetById('cepat');
      expect(cepat?.name).toBe('Cepat');
      expect(cepat?.latencyPreference).toBe('fast');

      const mendalam = getBuiltInPresetById('mendalam');
      expect(mendalam?.qualityPreference).toBe('very_high');
      expect(mendalam?.capabilities).toContain('reasoning');

      const coding = getBuiltInPresetById('coding');
      expect(coding?.taskCategory).toBe('coding');

      const akademik = getBuiltInPresetById('akademik');
      expect(akademik?.taskCategory).toBe('academic_writing');
      expect(akademik?.responseStyle).toBe('Akademik');

      const nonExistent = getBuiltInPresetById('non_existent');
      expect(nonExistent).toBeUndefined();
    });

    it('has a default preset of "seimbang"', () => {
      expect(DEFAULT_PRESET_ID).toBe('seimbang');
      const defaultPreset = getBuiltInPresetById(DEFAULT_PRESET_ID);
      expect(defaultPreset).toBeDefined();
      expect(defaultPreset?.id).toBe('seimbang');
    });
  });

  describe('2. Custom Preset Validation & Integrity', () => {
    it('validates a correct custom preset', () => {
      const result = validateCustomPreset({
        name: 'Skripsi Bab 1 & 2',
        description: 'Fokus pada penyusunan literatur dan latar belakang',
        routingMode: 'auto',
        taskCategory: 'academic_writing',
        latencyPreference: 'deep',
        qualityPreference: 'very_high',
        responseMode: 'Mendalam',
        responseStyle: 'Akademik'
      });

      expect(result.valid).toBe(true);
      expect(result.sanitizedPreset).toBeDefined();
      expect(result.sanitizedPreset?.name).toBe('Skripsi Bab 1 & 2');
      expect(result.sanitizedPreset?.scope).toBe('custom');
      expect(result.sanitizedPreset?.group).toBe('Custom');
    });

    it('rejects custom preset with missing or too short name', () => {
      const result = validateCustomPreset({ name: ' ' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('minimal 2 karakter');
    });

    it('rejects custom preset with duplicate name against existing custom presets', () => {
      const existing: WorkspaceAiPreset[] = [{
        id: 'cust_1',
        name: 'Review Makalah',
        description: 'Review',
        icon: 'Star',
        scope: 'custom',
        group: 'Custom',
        routingMode: 'auto',
        responseMode: 'Seimbang',
        responseStyle: 'Default'
      }];

      const result = validateCustomPreset({ name: 'Review Makalah' }, existing);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('sudah ada');
    });

    it('allows updating an existing custom preset keeping the same name', () => {
      const existing: WorkspaceAiPreset[] = [{
        id: 'cust_1',
        name: 'Review Makalah',
        description: 'Review',
        icon: 'Star',
        scope: 'custom',
        group: 'Custom',
        routingMode: 'auto',
        responseMode: 'Seimbang',
        responseStyle: 'Default'
      }];

      const result = validateCustomPreset({ id: 'cust_1', name: 'Review Makalah', description: 'Updated' }, existing);
      expect(result.valid).toBe(true);
    });

    it('sanitizes invalid or malicious fields and falls back to safe defaults', () => {
      const result = validateCustomPreset({
        name: 'Valid Name',
        responseMode: 'INVALID_MODE',
        responseStyle: '<script>alert(1)</script>',
        routingMode: 'unknown'
      });

      expect(result.valid).toBe(true);
      expect(result.sanitizedPreset?.responseMode).toBe('Seimbang');
      expect(result.sanitizedPreset?.responseStyle).toBe('Default');
      expect(result.sanitizedPreset?.routingMode).toBe('auto');
    });
  });

  describe('3. User Isolation & Local Storage Persistence', () => {
    it('isolates custom presets strictly per logged in user and guest', () => {
      // User A creates custom preset
      saveUserCustomPresets('user_A', [{
        id: 'c1',
        name: 'Preset User A',
        description: '',
        icon: 'Star',
        scope: 'custom',
        group: 'Custom',
        routingMode: 'auto'
      }]);

      // User B creates custom preset
      saveUserCustomPresets('user_B', [{
        id: 'c2',
        name: 'Preset User B',
        description: '',
        icon: 'Star',
        scope: 'custom',
        group: 'Custom',
        routingMode: 'auto'
      }]);

      const presetsA = loadUserCustomPresets('user_A');
      const presetsB = loadUserCustomPresets('user_B');
      const guestPresets = loadUserCustomPresets('guest');
      const nullPresets = loadUserCustomPresets(null);

      expect(presetsA.map(p => p.name)).toEqual(['Preset User A']);
      expect(presetsB.map(p => p.name)).toEqual(['Preset User B']);
      expect(guestPresets).toEqual([]);
      expect(nullPresets).toEqual([]);
    });

    it('isolates personalization preferences per user', () => {
      saveUserPersonalization('user_A', {
        defaultPresetId: 'coding',
        preferredResponseMode: 'Mendalam',
        preferredResponseStyle: 'Langkah demi langkah'
      });

      saveUserPersonalization('user_B', {
        defaultPresetId: 'cepat',
        preferredResponseMode: 'Ringkas',
        preferredResponseStyle: 'Default'
      });

      const prefA = loadUserPersonalization('user_A');
      const prefB = loadUserPersonalization('user_B');
      const prefGuest = loadUserPersonalization('guest');

      expect(prefA.defaultPresetId).toBe('coding');
      expect(prefA.preferredResponseMode).toBe('Mendalam');

      expect(prefB.defaultPresetId).toBe('cepat');
      expect(prefB.preferredResponseMode).toBe('Ringkas');

      // Guest gets canonical fallback
      expect(prefGuest.defaultPresetId).toBe(DEFAULT_PRESET_ID);
    });

    it('recovers gracefully from corrupted JSON in storage', () => {
      safeLocalStorage.setItem('ruangkerja_custom_presets_user_X', 'INVALID_JSON_%%%');
      expect(loadUserCustomPresets('user_X')).toEqual([]);

      safeLocalStorage.setItem('ruangkerja_personalization_user_X', '{ bad_json');
      expect(loadUserPersonalization('user_X').defaultPresetId).toBe(DEFAULT_PRESET_ID);
    });
  });

  describe('4. Preset Summary & Request Snapshot', () => {
    it('generates clean, compact preset summaries', () => {
      const cepat = getBuiltInPresetById('cepat')!;
      expect(getPresetSummary(cepat)).toBe('Auto · Ringkas');

      const akademik = getBuiltInPresetById('akademik')!;
      expect(getPresetSummary(akademik)).toBe('Auto · Mendalam · Akademik');

      const coding = getBuiltInPresetById('coding')!;
      expect(getPresetSummary(coding)).toBe('Auto · Mendalam · Langkah demi langkah');

      // When manual model is selected over preset
      expect(getPresetSummary(akademik, 'Gemini 3.8 Flash')).toBe('Gemini 3.8 Flash · Mendalam · Akademik');
    });

    it('builds an immutable request snapshot', () => {
      const akademik = getBuiltInPresetById('akademik')!;
      const snapshot = buildPresetRequestSnapshot(akademik, 'auto');

      expect(snapshot.presetId).toBe('akademik');
      expect(snapshot.routingMode).toBe('auto');
      expect(snapshot.taskCategory).toBe('academic_writing');
      expect(snapshot.responseMode).toBe('Mendalam');
      expect(snapshot.responseStyle).toBe('Akademik');
    });

    it('builds a manual model override snapshot correctly', () => {
      const coding = getBuiltInPresetById('coding')!;
      const snapshot = buildPresetRequestSnapshot(coding, 'gemini-3.8-flash');

      expect(snapshot.presetId).toBe('coding');
      expect(snapshot.routingMode).toBe('manual');
      expect(snapshot.selectedModelId).toBe('gemini-3.8-flash');
    });
  });
});
