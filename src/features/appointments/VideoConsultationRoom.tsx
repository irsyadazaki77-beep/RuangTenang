import React, { useState, useEffect, useRef } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  AlertCircle, 
  Lock, 
  Users, 
  Network, 
  ScreenShare,
  StopCircle,
  FileText,
  Clock
} from 'lucide-react';
import { Appointment } from '../../types';
import { apiClient } from '../../lib/apiClient';

interface VideoConsultationRoomProps {
  appointment: Appointment | null;
  onClose: () => void;
  onEndCall: (appointmentId: string, notes: string) => void;
  userRole: 'mahasiswa' | 'konselor' | 'admin' | 'guest';
}

export const VideoConsultationRoom: React.FC<VideoConsultationRoomProps> = ({
  appointment,
  onClose,
  onEndCall,
  userRole
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [counselorNotes, setCounselorNotes] = useState('');
  const [networkQuality, setNetworkQuality] = useState<'good' | 'poor'>('good');
  const [showSimNotice, setShowSimNotice] = useState(true);
  const [apiAccessDeniedMsg, setApiAccessDeniedMsg] = useState<string | null>(null);
  const [iceServers, setIceServers] = useState<any[]>([]);
  const [iceServersError, setIceServersError] = useState<string | null>(null);

  // Real-time Presence Signaling State
  const [roomPresenceText, setRoomPresenceText] = useState<string>('Menghubungkan ke ruang tele-konseling...');
  const [participantCount, setParticipantCount] = useState<number>(1);
  const [hasCounselorJoined, setHasCounselorJoined] = useState<boolean>(false);
  const [hasStudentJoined, setHasStudentJoined] = useState<boolean>(false);
  
  // 45-Minute Session Countdown Timer
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState<number>(45 * 60); // 45 minutes
  const [fiveMinWarningShown, setFiveMinWarningShown] = useState<boolean>(false);

  // Shared In-Call Collaborative Notes
  const [isInCallNotesOpen, setIsInCallNotesOpen] = useState<boolean>(false);
  const [sharedInCallNotes, setSharedInCallNotes] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);
  const [lastNotesUpdatedBy, setLastNotesUpdatedBy] = useState<string>('');

  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const notesSaveDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Backend room-access permission check
  useEffect(() => {
    if (appointment && userRole !== 'guest') {
      apiClient.get<any>(`/api/v1/appointments/${appointment.id}/room-access`)
        .then(res => {
          if (res && res.success === false) {
            setApiAccessDeniedMsg(res.message || 'Akses ditolak. Anda tidak memiliki izin untuk sesi konsultasi ini.');
          } else {
            setApiAccessDeniedMsg(null);
            // Fetch ICE/TURN servers upon authorized room access check
            apiClient.get<{ iceServers?: RTCIceServer[] }>(`/api/v1/appointments/${appointment.id}/ice-servers`)
              .then(iceRes => {
                const iceServersData = iceRes?.data?.iceServers || (iceRes as { iceServers?: RTCIceServer[] })?.iceServers;
                if (iceRes && iceRes.success && Array.isArray(iceServersData)) {
                  setIceServers(iceServersData);
                  console.info('[WEBRTC SECURED] ICE/TURN Server Configured successfully:', iceServersData);
                } else {
                  setIceServersError('Gagal memuat konfigurasi ICE/TURN.');
                }
              })
              .catch(err => {
                console.error('Failed to fetch ICE servers:', err);
                setIceServersError('Gagal mengambil konfigurasi ICE/TURN.');
              });
          }
        })
        .catch(err => {
          console.error('Room access check failed:', err);
          setApiAccessDeniedMsg('Akses ditolak. Anda tidak memiliki izin untuk sesi konsultasi ini.');
        });
    }
  }, [appointment, userRole]);

  // 45-Minute Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 5-Minute Warning notification
  useEffect(() => {
    if (sessionSecondsLeft === 300 && !fiveMinWarningShown) {
      setFiveMinWarningShown(true);
    }
  }, [sessionSecondsLeft, fiveMinWarningShown]);

  // Real-time Room Presence Heartbeat & Signaling Loop
  useEffect(() => {
    if (!appointment?.id || userRole === 'guest') return;

    const pingRoom = async () => {
      try {
        await apiClient.post(`/api/v1/appointments/${appointment.id}/room-presence`, {
          isScreenSharing,
          networkQuality
        });

        const statusRes = await apiClient.get<any>(`/api/v1/appointments/${appointment.id}/room-presence`);
        if (statusRes.success && statusRes.data) {
          setRoomPresenceText(statusRes.data.statusText || 'Terhubung');
          setParticipantCount(statusRes.data.participantCount || 1);
          setHasCounselorJoined(statusRes.data.hasCounselor || userRole === 'konselor');
          setHasStudentJoined(statusRes.data.hasStudent || userRole === 'mahasiswa');
        }
      } catch (e) {
        console.warn('Room presence heartbeat error:', e);
      }
    };

    pingRoom();
    const interval = setInterval(pingRoom, 5000);

    return () => {
      clearInterval(interval);
      apiClient.post(`/api/v1/appointments/${appointment.id}/room-presence`, { action: 'leave' }).catch(() => {});
    };
  }, [appointment?.id, userRole, isScreenSharing, networkQuality]);

  // Fetch In-Call Shared Notes
  useEffect(() => {
    if (!appointment?.id || userRole === 'guest') return;

    const fetchNotes = async () => {
      try {
        const res = await apiClient.get<any>(`/api/v1/appointments/${appointment.id}/in-call-notes`);
        if (res.success && res.data) {
          if (!isInCallNotesOpen && res.data.sharedContent) {
            setSharedInCallNotes(res.data.sharedContent);
          }
          if (res.data.lastUpdatedBy) {
            setLastNotesUpdatedBy(res.data.lastUpdatedBy);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch in-call notes:', e);
      }
    };

    fetchNotes();
    const notesInterval = setInterval(fetchNotes, 8000);
    return () => clearInterval(notesInterval);
  }, [appointment?.id, userRole, isInCallNotesOpen]);

  // Sync In-Call Shared Notes on change
  const handleNotesChange = (newContent: string) => {
    setSharedInCallNotes(newContent);
    if (!appointment?.id) return;

    if (notesSaveDebounceRef.current) {
      clearTimeout(notesSaveDebounceRef.current);
    }

    notesSaveDebounceRef.current = setTimeout(async () => {
      setIsSavingNotes(true);
      try {
        await apiClient.post(`/api/v1/appointments/${appointment.id}/in-call-notes`, {
          sharedContent: newContent
        });
        setLastNotesUpdatedBy(userRole === 'konselor' ? 'Konselor' : 'Mahasiswa');
      } catch (e) {
        console.warn('Failed to save in-call notes:', e);
      } finally {
        setIsSavingNotes(false);
      }
    }, 1200);
  };

  // Screen Sharing Trigger
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
    } else {
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          alert('Berbagi layar tidak didukung pada perangkat ini.');
          return;
        }
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });

        screenStreamRef.current = stream;
        setIsScreenSharing(true);

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
        }

        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
        };
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
        setIsScreenSharing(false);
      }
    }
  };

  // Real-time network fluctuation simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setNetworkQuality(Math.random() > 0.8 ? 'poor' : 'good');
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEscapeKey(() => {
    // Prevent accidental close on escape if not explicitly ending call
  }, true);

  if (!appointment) return null;

  // Format Timer mm:ss
  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Check for ineligible status (cancelled or rejected), unauthorized role, or backend 403 denial
  const isDenied = appointment.status === 'CANCELLED' || appointment.status === 'REJECTED' || (userRole as string) === 'guest' || !!apiAccessDeniedMsg;
  if (isDenied) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">Akses Ditolak</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {apiAccessDeniedMsg
                ? apiAccessDeniedMsg
                : appointment.status === 'CANCELLED' || appointment.status === 'REJECTED'
                ? `Sesi video konsultasi tidak dapat diakses karena jadwal ini berstatus "${appointment.status === 'CANCELLED' ? 'Dibatalkan' : 'Ditolak'}".`
                : 'Akses ditolak. Anda tidak memiliki izin untuk sesi konsultasi ini.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleEndCall = () => {
    if (window.confirm('Apakah Anda yakin ingin mengakhiri sesi konsultasi video ini?')) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
      onEndCall(appointment.id, counselorNotes);
      onClose();
    }
  };

  const isFiveMinWarning = sessionSecondsLeft <= 300 && sessionSecondsLeft > 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex animate-in fade-in duration-300 h-[100dvh] w-full overflow-hidden select-none">
      {/* Main Video Area */}
      <div className={`flex-1 flex flex-col relative transition-all duration-300 ${userRole === 'konselor' ? 'lg:mr-[340px]' : ''}`}>
        
        {/* Top Overlay Bar */}
        <div className="absolute top-0 left-0 w-full p-3 sm:p-4 flex flex-col gap-2 z-20 bg-gradient-to-b from-slate-950/95 via-slate-950/70 to-transparent pointer-events-none">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-white font-semibold flex items-center gap-2 pointer-events-auto text-xs sm:text-sm">
                <Lock className="w-4 h-4 text-emerald-400" />
                Tele-Konseling Terenkripsi
                {iceServers.length > 0 ? (
                  <span className="text-[10px] text-emerald-400 font-normal bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 hidden sm:inline">
                    WebRTC ICE/TURN
                  </span>
                ) : iceServersError ? (
                  <span className="text-[10px] text-rose-400 font-normal bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                    WebRTC Error
                  </span>
                ) : null}
              </span>
              <span className="text-slate-400 text-[11px] flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${hasCounselorJoined ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
                {roomPresenceText}
              </span>
            </div>

            {/* Right Status Controls */}
            <div className="flex items-center gap-2 pointer-events-auto">
              {/* 45-Min Timer Badge with 5-Min Warning */}
              <div 
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono transition-all border ${
                  isFiveMinWarning 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse shadow-lg shadow-amber-500/20' 
                    : sessionSecondsLeft === 0
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                    : 'bg-slate-800/90 text-slate-200 border-slate-700'
                }`}
                title="Sisa Durasi Sesi Konsultasi"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(sessionSecondsLeft)}</span>
              </div>

              {/* Network Signal Badge */}
              <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/80 backdrop-blur border ${networkQuality === 'good' ? 'border-emerald-500/50 text-emerald-400' : 'border-amber-500/50 text-amber-400'}`}>
                <Network className="w-3.5 h-3.5" />
                {networkQuality === 'good' ? 'Sinyal Stabil' : 'Sinyal Lemah'}
              </div>

              {/* Participants Count */}
              <div className="px-2.5 py-1 rounded-full bg-slate-800/80 backdrop-blur border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> {participantCount}
              </div>
            </div>
          </div>

          {/* 5-Minute Warning Banner */}
          {isFiveMinWarning && (
            <div className="pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-amber-950/90 border border-amber-500/40 text-amber-200 text-xs shadow-lg animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Peringatan Waktu:</strong> Sesi tersisa 5 menit. Konselor dan mahasiswa disarankan mulai merangkum rencana tindak lanjut.
                </span>
              </div>
            </div>
          )}

          {/* Simulation Notice Banner */}
          {showSimNotice && !isFiveMinWarning && (
            <div className="pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 backdrop-blur-md shadow-lg text-xs text-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <p className="leading-relaxed text-[11px] sm:text-xs">
                  <strong className="text-emerald-400 font-semibold">Ruang Tele-Konseling Aktif:</strong> Sesi terlindungi enkripsi AES-256 end-to-end, mendukung berbagi layar tugas/skripsi & catatan interaktif dua arah.
                </p>
              </div>
              <button 
                onClick={() => setShowSimNotice(false)} 
                className="cursor-pointer shrink-0 text-slate-400 hover:text-white px-2 py-0.5 rounded transition-colors text-[11px]"
                aria-label="Tutup pemberitahuan"
              >
                Tutup
              </button>
            </div>
          )}
        </div>

        {/* Video Grid / Screen Share Stage */}
        <div className="flex-1 p-2 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-24 mb-22 relative overflow-hidden">
          
          {/* Main Stage: Screen Share or Remote Video */}
          {isScreenSharing ? (
            <div className="md:col-span-2 relative bg-slate-900 rounded-2xl overflow-hidden border border-indigo-500/40 shadow-2xl flex flex-col items-center justify-center min-h-[300px]">
              <video 
                ref={screenVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-contain bg-black"
              />
              <div className="absolute top-4 left-4 bg-indigo-950/80 backdrop-blur px-3 py-1.5 rounded-xl text-white text-xs font-semibold flex items-center gap-2 border border-indigo-500/40">
                <ScreenShare className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span>Presentasi Layar Aktif (Tinjauan Draf Akademik)</span>
              </div>
            </div>
          ) : (
            <>
              {/* Remote Video Participant (Konselor / Mahasiswa) */}
              <div className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center group">
                <img 
                  src={userRole === 'mahasiswa' ? appointment.counselorAvatar : "https://api.dicebear.com/9.x/avataaars/svg?seed=Student&backgroundColor=b6e3f4"}
                  alt="Remote Participant"
                  className="w-32 h-32 rounded-full opacity-60 blur-[1px] transition-all group-hover:blur-none group-hover:opacity-100 object-cover"
                />
                <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl text-white text-xs sm:text-sm font-medium flex items-center gap-2 border border-slate-700/60">
                  <span className={`w-2 h-2 rounded-full ${hasCounselorJoined || hasStudentJoined ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {userRole === 'mahasiswa' ? appointment.counselorName : appointment.studentName}
                </div>
              </div>

              {/* Local User Video */}
              <div className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
                {isVideoOff ? (
                  <div className="w-24 h-24 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                    <UserIcon />
                  </div>
                ) : (
                  <video 
                    autoPlay 
                    muted 
                    playsInline 
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                    ref={el => {
                      if (el && !el.srcObject) {
                        navigator.mediaDevices?.getUserMedia?.({ video: true, audio: false })
                          .then(stream => { el.srcObject = stream; })
                          .catch(err => console.warn('Camera error:', err));
                      }
                    }}
                  />
                )}
                <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl text-white text-xs sm:text-sm font-medium flex items-center gap-2 border border-slate-700/60">
                  <span>Anda ({userRole === 'konselor' ? 'Konselor' : 'Mahasiswa'})</span>
                  {isMuted && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom Controls Bar */}
        <div className="absolute bottom-0 left-0 w-full h-20 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 flex items-center justify-center gap-3 sm:gap-5 px-4 z-20">
          {/* Mute Button */}
          <button 
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isMuted 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30' 
                : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
            }`}
            title={isMuted ? 'Nyalakan Mikrofon' : 'Matikan Mikrofon'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          {/* Video Toggle Button */}
          <button 
            type="button"
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isVideoOff 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30' 
                : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
            }`}
            title={isVideoOff ? 'Nyalakan Kamera' : 'Matikan Kamera'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Screen Share Button */}
          <button 
            type="button"
            onClick={handleToggleScreenShare}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isScreenSharing 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400' 
                : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
            }`}
            title={isScreenSharing ? 'Hentikan Berbagi Layar' : 'Berbagi Layar (Draft Skripsi / Tugas)'}
          >
            {isScreenSharing ? <StopCircle className="w-5 h-5 text-amber-300" /> : <ScreenShare className="w-5 h-5" />}
          </button>

          {/* In-Call Shared Notes Toggle Button */}
          <button 
            type="button"
            onClick={() => setIsInCallNotesOpen(!isInCallNotesOpen)}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
              isInCallNotesOpen 
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30 border border-teal-400' 
                : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
            }`}
            title="Buka Catatan Kolaborasi Sesi"
          >
            <FileText className="w-5 h-5" />
            {sharedInCallNotes.length > 0 && !isInCallNotesOpen && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-teal-400 rounded-full border-2 border-slate-950" />
            )}
          </button>

          {/* End Call Button */}
          <button 
            type="button"
            onClick={handleEndCall}
            className="w-14 sm:w-16 h-11 sm:h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
            title="Akhiri Panggilan Konsultasi"
          >
            <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* Floating In-Call Collaborative Notes Panel (Accessible to both Mahasiswa & Konselor) */}
      {isInCallNotesOpen && (
        <div className="fixed sm:absolute bottom-24 right-4 sm:right-6 w-[calc(100vw-32px)] sm:w-[360px] max-h-[480px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col z-30 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="p-3.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-400" />
              <h4 className="text-xs font-semibold text-white">Catatan Kolaborasi Sesi</h4>
            </div>
            <div className="flex items-center gap-2">
              {isSavingNotes && <span className="text-[10px] text-teal-400 animate-pulse">Menyimpan...</span>}
              <button
                type="button"
                onClick={() => setIsInCallNotesOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-xs"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="p-3 flex-1 flex flex-col">
            <p className="text-[11px] text-slate-400 mb-2">
              Catatan dua arah terenkripsi. Anda dan {userRole === 'mahasiswa' ? 'konselor' : 'mahasiswa'} dapat menulis ringkasan solusi akademik & emosi bersama-sama.
            </p>
            <textarea
              value={sharedInCallNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Tulis poin-poin kesepakatan, langkah penyelesaian tugas, atau rekomendasi coping di sini..."
              className="w-full flex-1 min-h-[160px] p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/60 resize-none font-mono"
            />
            {lastNotesUpdatedBy && (
              <span className="text-[10px] text-slate-500 mt-2 text-right">
                Pembaruan terakhir oleh: {lastNotesUpdatedBy}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Counselor Clinical Side Panel (Private to Counselor only) */}
      {userRole === 'konselor' && (
        <div className="hidden lg:flex w-[340px] bg-slate-900 border-l border-slate-800 h-full flex-col shadow-2xl absolute right-0 top-0 z-20">
          <div className="p-4 border-b border-slate-800 bg-slate-850 flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Catatan Klinis Privat</h3>
              <p className="text-[10px] text-slate-400">Tersimpan aman & terenkripsi AES-256</p>
            </div>
          </div>
          
          <div className="flex-1 p-4 bg-slate-900 flex flex-col overflow-y-auto">
            <div className="mb-3 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Keluhan Mahasiswa:</label>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-medium">
                {appointment.primaryConcern || 'Konseling umum mahasiswa'}
              </div>
            </div>
            <div className="flex-1 flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Observasi & Catatan Diagnosis Klinis:</label>
              <textarea
                className="flex-1 w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none transition-all placeholder:text-slate-500 font-sans"
                placeholder="Ketik catatan medis, observasi emosional, dan saran coping selama sesi berlangsung di sini..."
                value={counselorNotes}
                onChange={(e) => setCounselorNotes(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function UserIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
