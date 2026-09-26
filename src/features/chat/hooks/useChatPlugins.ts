import { useState, useEffect, useCallback } from 'react';

export function useChatPlugins() {
  const [activePlugin, setActivePlugin] = useState<string | null>(null);
  const [isBreathingOpen, setIsBreathingOpen] = useState(false);
  const [isGroundingOpen, setIsGroundingOpen] = useState(false);

  const handleOpenPlugin = useCallback((plugin: string) => {
    if (plugin === 'breathing') {
      setIsBreathingOpen(true);
      return;
    }
    if (plugin === 'grounding' || plugin === '54321' || plugin === 'panik') {
      setIsGroundingOpen(true);
      return;
    }
    setActivePlugin(plugin);
  }, []);

  const handleClosePlugin = useCallback(() => {
    setActivePlugin(null);
  }, []);

  useEffect(() => {
    const handleOpenPluginEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      handleOpenPlugin(customEvent.detail);
    };
    window.addEventListener('openPlugin', handleOpenPluginEvent);
    return () => {
      window.removeEventListener('openPlugin', handleOpenPluginEvent);
    };
  }, [handleOpenPlugin]);

  return {
    activePlugin,
    setActivePlugin,
    isBreathingOpen,
    setIsBreathingOpen,
    isGroundingOpen,
    setIsGroundingOpen,
    handleOpenPlugin,
    handleClosePlugin
  };
}
