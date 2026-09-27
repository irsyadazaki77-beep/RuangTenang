import { useState, useEffect, useCallback } from 'react';
import { AcademicTaskTemplate } from '../types';
import { ACADEMIC_TEMPLATES } from '../components/AcademicToolsBar';

export function useWorkspaceTemplates() {
  const [selectedTemplateForModal, setSelectedTemplateForModal] = useState<AcademicTaskTemplate | null>(null);
  const [templateInputSnippet, setTemplateInputSnippet] = useState<string>('');

  useEffect(() => {
    const handleTemplateEvent = (e: Event) => {
      const customEvt = e as CustomEvent<string>;
      const templateId = customEvt.detail;
      const found = ACADEMIC_TEMPLATES.find(t => t.id === templateId);
      if (found) {
        setSelectedTemplateForModal(found);
        setTemplateInputSnippet('');
      }
    };

    window.addEventListener('ruangkerja_trigger_template', handleTemplateEvent);
    return () => {
      window.removeEventListener('ruangkerja_trigger_template', handleTemplateEvent);
    };
  }, []);

  const openTemplateModal = useCallback((template?: AcademicTaskTemplate) => {
    setSelectedTemplateForModal(template || ACADEMIC_TEMPLATES[0]);
    setTemplateInputSnippet('');
  }, []);

  const closeTemplateModal = useCallback(() => {
    setSelectedTemplateForModal(null);
    setTemplateInputSnippet('');
  }, []);

  return {
    selectedTemplateForModal,
    templateInputSnippet,
    setTemplateInputSnippet,
    openTemplateModal,
    closeTemplateModal
  };
}
