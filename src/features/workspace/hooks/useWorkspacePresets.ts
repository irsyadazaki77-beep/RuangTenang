import { useState, useCallback, useMemo, useEffect } from 'react';
import type { 
  WorkspaceAiPreset, 
  PresetId, 
  UserPersonalizationPreferences,
  PresetSelectionSnapshot
} from '../../../lib/aiPresets';
import { AUTO_ROUTING_MODEL_ID } from '../../../lib/aiModels';
import { BUILT_IN_PRESETS, DEFAULT_PRESET_ID, getBuiltInPresetById } from '../constants/presetConstants';
import {
  loadUserCustomPresets,
  saveUserCustomPresets,
  loadUserPersonalization,
  saveUserPersonalization,
  loadActivePresetId,
  saveActivePresetId,
  validateCustomPreset,
  getPresetSummary,
  buildPresetRequestSnapshot
} from '../utils/workspacePresetManager';
import { useAiModelCatalog } from '../../../lib/aiModelCatalog';

interface UseWorkspacePresetsProps {
  userId?: string | null;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export function useWorkspacePresets({
  userId,
  selectedModel,
  onModelChange
}: UseWorkspacePresetsProps) {
  const { models } = useAiModelCatalog();
  const [customPresets, setCustomPresets] = useState<WorkspaceAiPreset[]>(() => loadUserCustomPresets(userId));
  const [personalization, setPersonalization] = useState<UserPersonalizationPreferences>(() => loadUserPersonalization(userId));
  const [activePresetId, setActivePresetIdState] = useState<PresetId>(() => loadActivePresetId(userId));

  // Reload preferences when active user changes
  useEffect(() => {
    const loadedCustom = loadUserCustomPresets(userId);
    const loadedPersonalization = loadUserPersonalization(userId);
    const loadedActiveId = loadActivePresetId(userId);

    setCustomPresets(loadedCustom);
    setPersonalization(loadedPersonalization);
    setActivePresetIdState(loadedActiveId);
  }, [userId]);

  // Combine built-in and custom presets
  const allPresets = useMemo(() => {
    return [...BUILT_IN_PRESETS, ...customPresets];
  }, [customPresets]);

  // Resolve currently active preset object
  const activePreset = useMemo(() => {
    const found = allPresets.find(p => p.id === activePresetId);
    if (found) return found;
    // Fallback to default preset if active preset ID was deleted or not found
    return getBuiltInPresetById(DEFAULT_PRESET_ID) || BUILT_IN_PRESETS[1];
  }, [allPresets, activePresetId]);

  // Detect whether user manually overrode the preset's model
  const isManualModelOverride = useMemo(() => {
    if (activePreset.routingMode === 'auto') {
      return selectedModel !== AUTO_ROUTING_MODEL_ID;
    }
    if (activePreset.preferredModelId) {
      return selectedModel !== activePreset.preferredModelId;
    }
    return false;
  }, [activePreset, selectedModel]);

  // Preset summary string
  const activePresetSummary = useMemo(() => {
    const manualModelName = isManualModelOverride
      ? (models.find(m => m.id === selectedModel)?.name || selectedModel)
      : undefined;
    return getPresetSummary(activePreset, manualModelName);
  }, [activePreset, isManualModelOverride, selectedModel, models]);

  // Select a preset
  const selectPreset = useCallback((presetId: PresetId) => {
    const target = allPresets.find(p => p.id === presetId);
    if (!target) return;

    setActivePresetIdState(target.id);
    saveActivePresetId(userId, target.id);

    // Apply preset model preference to model selector
    if (target.routingMode === 'auto') {
      onModelChange(AUTO_ROUTING_MODEL_ID);
    } else if (target.preferredModelId) {
      // Validate model exists in catalog before forcing it
      const exists = models.some(m => m.id === target.preferredModelId && m.selectable);
      onModelChange(exists ? target.preferredModelId : AUTO_ROUTING_MODEL_ID);
    }
  }, [allPresets, userId, models, onModelChange]);

  // Create a new custom preset
  const createCustomPreset = useCallback((presetData: Partial<WorkspaceAiPreset>): { success: boolean; error?: string; preset?: WorkspaceAiPreset } => {
    const validation = validateCustomPreset(presetData, customPresets);
    if (!validation.valid || !validation.sanitizedPreset) {
      return { success: false, error: validation.error || 'Validasi preset gagal.' };
    }

    const newPreset = validation.sanitizedPreset;
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    saveUserCustomPresets(userId, updated);

    // Automatically select the newly created preset
    setActivePresetIdState(newPreset.id);
    saveActivePresetId(userId, newPreset.id);

    if (newPreset.routingMode === 'manual' && newPreset.preferredModelId) {
      onModelChange(newPreset.preferredModelId);
    } else {
      onModelChange(AUTO_ROUTING_MODEL_ID);
    }

    return { success: true, preset: newPreset };
  }, [customPresets, userId, onModelChange]);

  // Edit an existing custom preset
  const updateCustomPreset = useCallback((presetId: string, updates: Partial<WorkspaceAiPreset>): { success: boolean; error?: string } => {
    const existing = customPresets.find(p => p.id === presetId);
    if (!existing) {
      return { success: false, error: 'Preset kustom tidak ditemukan.' };
    }

    const merged = { ...existing, ...updates, id: presetId };
    const validation = validateCustomPreset(merged, customPresets);
    if (!validation.valid || !validation.sanitizedPreset) {
      return { success: false, error: validation.error || 'Validasi pembaruan gagal.' };
    }

    const updated = customPresets.map(p => p.id === presetId ? validation.sanitizedPreset! : p);
    setCustomPresets(updated);
    saveUserCustomPresets(userId, updated);

    return { success: true };
  }, [customPresets, userId]);

  // Duplicate a preset (built-in or custom) to a new custom preset
  const duplicatePreset = useCallback((sourcePresetId: string, newName?: string): { success: boolean; error?: string; preset?: WorkspaceAiPreset } => {
    const source = allPresets.find(p => p.id === sourcePresetId);
    if (!source) {
      return { success: false, error: 'Preset sumber tidak ditemukan.' };
    }

    const targetName = (newName && newName.trim()) 
      ? newName.trim() 
      : `${source.name} (Salinan)`;

    return createCustomPreset({
      ...source,
      id: undefined,
      name: targetName,
      scope: 'custom',
      group: 'Custom'
    });
  }, [allPresets, createCustomPreset]);

  // Delete a custom preset
  const deleteCustomPreset = useCallback((presetId: string): { success: boolean; error?: string } => {
    const target = customPresets.find(p => p.id === presetId);
    if (!target) {
      return { success: false, error: 'Preset kustom tidak ditemukan atau merupakan preset bawaan.' };
    }

    const updated = customPresets.filter(p => p.id !== presetId);
    setCustomPresets(updated);
    saveUserCustomPresets(userId, updated);

    // If active preset is deleted, fall back to default
    if (activePresetId === presetId) {
      const fallbackId = personalization.defaultPresetId || DEFAULT_PRESET_ID;
      selectPreset(fallbackId);
    }

    return { success: true };
  }, [customPresets, userId, activePresetId, personalization.defaultPresetId, selectPreset]);

  // Set default preset for user personalization
  const setDefaultPreset = useCallback((presetId: PresetId) => {
    const updated: UserPersonalizationPreferences = {
      ...personalization,
      defaultPresetId: presetId
    };
    setPersonalization(updated);
    saveUserPersonalization(userId, updated);
  }, [personalization, userId]);

  // Reset all preferences back to system defaults
  const resetPersonalization = useCallback(() => {
    const defaults: UserPersonalizationPreferences = {
      defaultPresetId: DEFAULT_PRESET_ID,
      preferredResponseMode: 'Seimbang',
      preferredResponseStyle: 'Default'
    };
    setPersonalization(defaults);
    saveUserPersonalization(userId, defaults);
    selectPreset(DEFAULT_PRESET_ID);
    onModelChange(AUTO_ROUTING_MODEL_ID);
  }, [userId, selectPreset, onModelChange]);

  // Snapshot builder for outgoing request
  const getRequestSnapshot = useCallback((): PresetSelectionSnapshot => {
    return buildPresetRequestSnapshot(activePreset, selectedModel);
  }, [activePreset, selectedModel]);

  return {
    allPresets,
    customPresets,
    activePreset,
    activePresetId,
    activePresetSummary,
    isManualModelOverride,
    personalization,
    selectPreset,
    createCustomPreset,
    updateCustomPreset,
    duplicatePreset,
    deleteCustomPreset,
    setDefaultPreset,
    resetPersonalization,
    getRequestSnapshot
  };
}
