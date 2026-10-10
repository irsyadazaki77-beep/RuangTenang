/**
 * RuangTenang - Aurora Ambient Experience 2.0 Event Contracts
 * 
 * Event decoupled untuk menyinkronkan status aktivitas AI (MainChat & StudentWorkspace)
 * ke visual state ambient AuroraBackground (idle -> preparing -> thinking -> streaming -> finishing -> idle).
 */

export const AURORA_STREAMING_EVENT = 'rt-aurora-streaming';
export const AURORA_ACTIVITY_EVENT = 'rt-aurora-activity';

export type AuroraMode = 'RUANG_TENANG' | 'RUANG_KERJA';
export type AuroraPhase = 'idle' | 'preparing' | 'thinking' | 'streaming' | 'finishing' | 'error';

export interface AuroraStreamingEventDetail {
  isStreaming: boolean;
}

export interface AuroraActivityEvent {
  mode: AuroraMode;
  phase: AuroraPhase;
  requestId?: string;
  chatId?: string;
  workspaceId?: string;
  timestamp?: number;
}

/**
 * Dispatch status aktivitas AI dengan mode dan lifecycle eksplisit.
 */
export function dispatchAuroraActivity(detail: AuroraActivityEvent): void {
  if (typeof window !== 'undefined') {
    const enriched: AuroraActivityEvent = {
      ...detail,
      timestamp: detail.timestamp ?? Date.now(),
    };
    window.dispatchEvent(
      new CustomEvent<AuroraActivityEvent>(AURORA_ACTIVITY_EVENT, {
        detail: enriched,
      })
    );
  }
}

/**
 * Dispatch status streaming AI (kompatibilitas backward untuk handler lama).
 */
export function dispatchAuroraStreaming(isStreaming: boolean): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<AuroraStreamingEventDetail>(AURORA_STREAMING_EVENT, {
        detail: { isStreaming },
      })
    );
  }
}
