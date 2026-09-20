import React from 'react';
import { AuroraBackground, AuroraBackgroundProps } from '../../../components/ui/AuroraBackground';

export type ChatAuroraBackgroundProps = AuroraBackgroundProps;

/**
 * ChatAuroraBackground - Proxy component yang mengarahkan langsung ke Fluid Gemini Sanctuary Ambient Aurora Background.
 */
export const ChatAuroraBackground: React.FC<ChatAuroraBackgroundProps> = (props) => {
  return <AuroraBackground {...props} />;
};

export default ChatAuroraBackground;
