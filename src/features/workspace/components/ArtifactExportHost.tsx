import React from 'react';
import { WorkspaceArtifact } from '../types';

const ExportModal = React.lazy(() => import('./ExportModal').then(module => ({ default: module.ExportModal })));

interface ArtifactExportHostProps {
  isOpen: boolean;
  artifact: WorkspaceArtifact;
  content: string;
  onClose: () => void;
  showToast: (message: string, type: 'info' | 'success' | 'error') => void;
  onGenerateBibTeX: (content: string, title?: string) => string;
  onGenerateRIS: (content: string, title?: string) => string;
}

export const ArtifactExportHost: React.FC<ArtifactExportHostProps> = ({ isOpen, artifact, content, onClose, showToast, onGenerateBibTeX, onGenerateRIS }) => isOpen
  ? <React.Suspense fallback={null}><ExportModal isOpen={isOpen} onClose={onClose} artifact={artifact} content={content} showToast={showToast} onGenerateBibTeX={onGenerateBibTeX} onGenerateRIS={onGenerateRIS} /></React.Suspense>
  : null;

