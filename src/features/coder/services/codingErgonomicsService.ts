/**
 * Coding Ergonomics & Frustration Detector Service for Ruang Coder.
 * Analyzes developer stress indicators (consecutive errors, rapid backspace bursts,
 * extended screen sessions, and 20-20-20 eye strain rules) to maintain student well-being.
 */

export interface ErgonomicsState {
  consecutiveErrorCount: number;
  sessionMinutes: number;
  lastBreakTimestamp: number;
  eyeStrainTimerSeconds: number; // 20-20-20 rule (1200 seconds max)
  isEyeStrainAlertDue: boolean;
  frustrationScore: number; // 0 - 100
  stressLevel: 'calm' | 'focused' | 'fatigued' | 'stuck_frustrated';
  recommendedAction: string;
}

export type ErgonomicsListener = (state: ErgonomicsState) => void;

class CodingErgonomicsManager {
  private consecutiveErrors = 0;
  private sessionStart = Date.now();
  private lastBreakTime = Date.now();
  private eyeStrainSeconds = 20 * 60; // 20 minutes
  private rapidUndoBurstCount = 0;
  private listeners: Set<ErgonomicsListener> = new Set();
  private timerInterval: any = null;

  constructor() {
    this.startEyeStrainTicker();
  }

  public subscribe(listener: ErgonomicsListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public recordError(_errorSummary?: string) {
    this.consecutiveErrors += 1;
    this.notify();
  }

  public recordSuccess() {
    if (this.consecutiveErrors > 0) {
      this.consecutiveErrors = Math.max(0, this.consecutiveErrors - 1);
      this.notify();
    }
  }

  public recordRapidEditBurst() {
    this.rapidUndoBurstCount += 1;
    if (this.rapidUndoBurstCount > 8) {
      this.consecutiveErrors += 1;
      this.rapidUndoBurstCount = 0;
    }
    this.notify();
  }

  public recordBreakTaken() {
    this.lastBreakTime = Date.now();
    this.consecutiveErrors = 0;
    this.eyeStrainSeconds = 20 * 60;
    this.notify();
  }

  public resetEyeStrainTimer() {
    this.eyeStrainSeconds = 20 * 60;
    this.notify();
  }

  private startEyeStrainTicker() {
    if (typeof window === 'undefined') return;
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      if (this.eyeStrainSeconds > 0) {
        this.eyeStrainSeconds -= 1;
      }
      this.notify();
    }, 1000);
  }

  public getState(): ErgonomicsState {
    const elapsedTotalMinutes = Math.floor((Date.now() - this.sessionStart) / (1000 * 60));
    const elapsedSinceBreakMinutes = Math.floor((Date.now() - this.lastBreakTime) / (1000 * 60));

    // Calculate frustration score
    let score = 0;
    score += Math.min(50, this.consecutiveErrors * 15);
    if (elapsedSinceBreakMinutes > 45) score += 25;
    else if (elapsedSinceBreakMinutes > 25) score += 15;

    score = Math.min(100, Math.max(0, score));

    let stressLevel: ErgonomicsState['stressLevel'] = 'calm';
    let recommendedAction = 'Kondisi stabil. Terus berkarya dengan santai.';

    if (score >= 75) {
      stressLevel = 'stuck_frustrated';
      recommendedAction = 'Terdeteksi hambatan berulang (>3 kali error berturut-turut). Disarankan rehat sejenak dan biarkan Ki Hadjar menguraikan solusinya.';
    } else if (score >= 50) {
      stressLevel = 'fatigued';
      recommendedAction = 'Mata dan pikiran mulai lelah. Lakukan peregangan leher dan minum segelas air.';
    } else if (score >= 25) {
      stressLevel = 'focused';
      recommendedAction = 'Dalam alur fokus produktif (deep flow).';
    }

    return {
      consecutiveErrorCount: this.consecutiveErrors,
      sessionMinutes: elapsedTotalMinutes,
      lastBreakTimestamp: this.lastBreakTime,
      eyeStrainTimerSeconds: this.eyeStrainSeconds,
      isEyeStrainAlertDue: this.eyeStrainSeconds <= 0,
      frustrationScore: score,
      stressLevel,
      recommendedAction
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach(cb => cb(state));
  }
}

export const codingErgonomicsService = new CodingErgonomicsManager();
