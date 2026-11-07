import React from 'react';
import {
  FluidVoiceCompanionModal
} from './FluidVoiceCompanionModal';

export interface WalkAndTalkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => void;
  lastAssistantMessage?: string;
  isAiStreaming?: boolean;
}

/**
 * WalkAndTalkModal provides backward-compatible wrapper
 * around the next-generation FluidVoiceCompanionModal.
 */
export const WalkAndTalkModal: React.FC<WalkAndTalkModalProps> = ({
  isOpen,
  onClose,
  onSendMessage,
  lastAssistantMessage,
  isAiStreaming
}) => {
  return (
    <FluidVoiceCompanionModal
      isOpen={isOpen}
      onClose={onClose}
      onSendMessage={onSendMessage}
      lastAssistantMessage={lastAssistantMessage}
      isAiStreaming={isAiStreaming}
      initialPersona="empathetic_counselor"
    />
  );
};
