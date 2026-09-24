/**
 * RuangTenang - Aurora Streaming Event Contracts
 * 
 * Event decoupled untuk menyinkronkan status aktivitas AI (MainChat & StudentWorkspace)
 * ke visual state ambient AuroraBackground (idle -> thinking -> finishing).
 */

export const AURORA_STREAMING_EVENT = 'rt-aurora-streaming';

export interface AuroraStreamingEventDetail {
  isStreaming: boolean;
}

/**
 * Dispatch status streaming AI secara konsisten ke seluruh aplikasi.
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
