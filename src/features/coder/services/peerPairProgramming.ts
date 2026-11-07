/**
 * Real-time Peer Pair-Programming & Lab Asistensi Service for Ruang Coder.
 * Facilitates Driver/Navigator collaboration, inline peer review annotations,
 * and generates official campus Lab Asistensi verification cards.
 */

export interface PeerReviewAnnotation {
  id: string;
  filePath: string;
  lineNumber: number;
  author: string;
  authorRole: 'navigator' | 'asisten_lab' | 'dosen_pengampu' | 'rekan_tim';
  comment: string;
  category: 'saran_perbaikan' | 'catatan_asistensi' | 'pertanyaan' | 'apresiasi';
  resolved: boolean;
  timestamp: string;
}

export interface PairSessionState {
  roomCode: string;
  myRole: 'driver' | 'navigator';
  partnerName: string;
  isConnected: boolean;
  annotations: PeerReviewAnnotation[];
}

export type PairSessionListener = (state: PairSessionState) => void;

class PeerPairProgrammingManager {
  private roomCode: string = '';
  private myRole: 'driver' | 'navigator' = 'driver';
  private partnerName: string = 'Rekan Mahasiswa';
  private isConnected: boolean = false;
  private annotations: PeerReviewAnnotation[] = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Set<PairSessionListener> = new Set();

  constructor() {
    this.initBroadcast();
  }

  private initBroadcast() {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;

    try {
      this.broadcastChannel = new BroadcastChannel('ruangcoder_pair_channel');
      this.broadcastChannel.onmessage = (event) => {
        const msg = event.data;
        if (!msg || typeof msg !== 'object') return;

        if (msg.type === 'PEER_JOIN' && msg.roomCode === this.roomCode) {
          this.isConnected = true;
          this.partnerName = msg.senderName || 'Rekan Tim';
          this.notify();
          // Echo back state
          this.broadcastChannel?.postMessage({
            type: 'STATE_SYNC',
            roomCode: this.roomCode,
            annotations: this.annotations,
            senderName: 'Driver Utama'
          });
        } else if (msg.type === 'STATE_SYNC' && msg.roomCode === this.roomCode) {
          this.isConnected = true;
          if (Array.isArray(msg.annotations)) {
            this.annotations = msg.annotations;
          }
          this.notify();
        } else if (msg.type === 'ADD_ANNOTATION' && msg.roomCode === this.roomCode) {
          if (msg.annotation) {
            this.annotations = [msg.annotation, ...this.annotations.filter(a => a.id !== msg.annotation.id)];
            this.notify();
          }
        } else if (msg.type === 'RESOLVE_ANNOTATION' && msg.roomCode === this.roomCode) {
          this.annotations = this.annotations.map(a => a.id === msg.id ? { ...a, resolved: true } : a);
          this.notify();
        }
      };
    } catch {
      // BroadcastChannel unavailable
    }
  }

  public createRoom(_hostName: string = 'Mahasiswa 1'): string {
    const code = `RC-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    this.roomCode = code;
    this.myRole = 'driver';
    this.isConnected = false;
    this.notify();
    return code;
  }

  public joinRoom(code: string, peerName: string = 'Mahasiswa 2') {
    this.roomCode = code.toUpperCase().trim();
    this.myRole = 'navigator';
    this.isConnected = true;
    this.partnerName = 'Driver Partner';

    this.broadcastChannel?.postMessage({
      type: 'PEER_JOIN',
      roomCode: this.roomCode,
      senderName: peerName
    });

    this.notify();
  }

  public setRole(role: 'driver' | 'navigator') {
    this.myRole = role;
    this.notify();
  }

  public addAnnotation(annotation: Omit<PeerReviewAnnotation, 'id' | 'timestamp' | 'resolved'>): PeerReviewAnnotation {
    const newAnnot: PeerReviewAnnotation = {
      ...annotation,
      id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      resolved: false,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    this.annotations = [newAnnot, ...this.annotations];

    this.broadcastChannel?.postMessage({
      type: 'ADD_ANNOTATION',
      roomCode: this.roomCode,
      annotation: newAnnot
    });

    this.notify();
    return newAnnot;
  }

  public resolveAnnotation(id: string) {
    this.annotations = this.annotations.map(a => (a.id === id ? { ...a, resolved: true } : a));

    this.broadcastChannel?.postMessage({
      type: 'RESOLVE_ANNOTATION',
      roomCode: this.roomCode,
      id
    });

    this.notify();
  }

  public subscribe(listener: PairSessionListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState(): PairSessionState {
    return {
      roomCode: this.roomCode,
      myRole: this.myRole,
      partnerName: this.partnerName,
      isConnected: this.isConnected,
      annotations: [...this.annotations]
    };
  }

  public generateLabAsistensiCard(projectName: string = 'Ruang Coder Workspace'): string {
    const dateStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const total = this.annotations.length;
    const resolved = this.annotations.filter(a => a.resolved).length;

    let md = `# KARTU ASISTENSI & PEER-REVIEW PRAKTIKUM\n\n`;
    md += `**Proyek / Modul:** ${projectName}\n`;
    md += `**Kode Room Kolaborasi:** \`${this.roomCode || 'LOKAL'}\`\n`;
    md += `**Waktu Sesi:** ${dateStr}\n`;
    md += `**Status Asistensi:** ${resolved === total && total > 0 ? '✅ Siap Dinilai (Semua Catatan Dituntaskan)' : '📝 Dalam Pembahasan Review'}\n\n`;
    md += `---\n\n`;
    md += `### Ringkasan Catatan Peer Reviewer & Asisten Lab\n\n`;
    md += `| File | Baris | Reviewer | Tipe | Status | Catatan |\n`;
    md += `|---|---|---|---|---|---|\n`;

    if (this.annotations.length === 0) {
      md += `| - | - | Belum ada catatan | - | - | Belum ada review yang disematkan |\n`;
    } else {
      this.annotations.forEach(a => {
        md += `| \`${a.filePath}\` | Baris ${a.lineNumber} | ${a.author} (${a.authorRole}) | ${a.category} | ${a.resolved ? '✅ Selesai' : '⏳ Terbuka'} | ${a.comment.replace(/\|/g, '-')} |\n`;
      });
    }

    md += `\n\n---\n*Diverifikasi secara otomatis melalui Ruang Coder Pair-Programming Hub — RuangTenang Kampus*`;
    return md;
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach(cb => cb(s));
  }
}

export const peerPairProgrammingService = new PeerPairProgrammingManager();
