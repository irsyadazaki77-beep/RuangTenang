import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Clock,
  RefreshCw
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
  const appointmentId = appointment?.id;
  // Media & Device State
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isCameraDenied, setIsCameraDenied] = useState<boolean>(false);

  // WebRTC & Connection State
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([
    { urls: 'stun:stun.l.google.com:19302' }
  ]);
  const [iceServersError, setIceServersError] = useState<string | null>(null);
  const [hasRemoteStream, setHasRemoteStream] = useState<boolean>(false);
  const [remoteScreenSharing, setRemoteScreenSharing] = useState<boolean>(false);
  const [networkQuality] = useState<'good' | 'poor'>('good');
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  // UI & Presence State
  const [counselorNotes, setCounselorNotes] = useState('');
  const [showSimNotice, setShowSimNotice] = useState(true);
  const [apiAccessDeniedMsg, setApiAccessDeniedMsg] = useState<string | null>(null);
  const [roomAccessGranted, setRoomAccessGranted] = useState(false);
  const [roomPresenceText, setRoomPresenceText] = useState<string>('Memeriksa izin akses ruangan...');
  const [participantCount, setParticipantCount] = useState<number>(1);
  const [hasCounselorJoined, setHasCounselorJoined] = useState<boolean>(false);
  const [hasStudentJoined, setHasStudentJoined] = useState<boolean>(false);
  
  // 45-Minute Session Countdown Timer
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState<number>(45 * 60);
  const [fiveMinWarningShown, setFiveMinWarningShown] = useState<boolean>(false);

  // Shared In-Call Collaborative Notes
  const [isInCallNotesOpen, setIsInCallNotesOpen] = useState<boolean>(false);
  const [sharedInCallNotes, setSharedInCallNotes] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);
  const [lastNotesUpdatedBy, setLastNotesUpdatedBy] = useState<string>('');

  // Refs for WebRTC & Media streams
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const lastSignalTimeRef = useRef<number>(0);
  const isInitiatorRef = useRef<boolean>(userRole === 'konselor');
  const notesSaveDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const iceRefreshInFlightRef = useRef(false);

  // 1. Authorization check & ICE server configuration loading
  useEffect(() => {
    isMountedRef.current = true;
    setRoomAccessGranted(false);
    if (!appointment || userRole === 'guest') return;

    let isSubscribed = true;

    apiClient.get<any>(`/api/v1/appointments/${appointment.id}/room-access`)
      .then(res => {
        if (!isSubscribed) return;
        if (res && res.success === false) {
          setApiAccessDeniedMsg(res.message || 'Akses ditolak. Anda tidak memiliki izin untuk sesi konsultasi ini.');
          setRoomAccessGranted(false);
        } else {
          setApiAccessDeniedMsg(null);
          setRoomPresenceText('Menginisialisasi koneksi terenkripsi...');

          const loadIceServers = () => apiClient.get<any>(`/api/v1/appointments/${appointment.id}/ice-servers`)
            .then(iceRes => {
              if (!isSubscribed) return;
              const rawData: any = iceRes?.data || iceRes;
              const servers: RTCIceServer[] = rawData?.iceServers;
              if (iceRes && iceRes.success && Array.isArray(servers) && servers.length > 0) {
                setIceServers(servers);
                setIceServersError(null);
                setRoomAccessGranted(true);
              } else {
                setIceServersError('Gagal memuat konfigurasi ICE/TURN.');
                setApiAccessDeniedMsg('Izin sesi tidak dapat divalidasi ulang. Silakan keluar dan coba lagi.');
              }
            })
            .catch(err => {
              if (!isSubscribed) return;
              console.warn('Room ICE authorization failed:', err);
              setIceServersError('Gagal mengambil konfigurasi ICE/TURN.');
              setApiAccessDeniedMsg('Izin sesi tidak dapat divalidasi ulang. Silakan keluar dan coba lagi.');
            });

          if (userRole === 'konselor' && appointment.status === 'CONFIRMED') {
            apiClient.put(`/api/v1/appointments/${appointment.id}`, { status: 'IN_PROGRESS' })
              .then(startRes => {
                if (!isSubscribed) return;
                if (!startRes.success) {
                  setApiAccessDeniedMsg(startRes.error === 'SESSION_START_NOT_AVAILABLE'
                    ? 'Sesi belum berada dalam jendela waktu yang diizinkan.'
                    : 'Status jadwal berubah di server. Muat ulang jadwal sebelum membuka sesi.');
                  return;
                }
                loadIceServers();
              })
              .catch(err => {
                if (!isSubscribed) return;
                console.warn('Could not start appointment session:', err);
                setApiAccessDeniedMsg('Sesi gagal dimulai. Muat ulang jadwal dan coba lagi.');
              });
          } else {
            loadIceServers();
          }
        }
      })
      .catch(err => {
        if (!isSubscribed) return;
        console.error('Room access check failed:', err);
        setApiAccessDeniedMsg('Akses ditolak. Anda tidak memiliki izin untuk sesi konsultasi ini.');
      });

    return () => {
      isSubscribed = false;
    };
  }, [appointment, userRole]);

  // 2. Local Media Capture (Camera & Microphone)
  const initLocalMedia = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMediaError('Perangkat browser tidak mendukung akses media (getUserMedia).');
        return null;
      }

      // Stop previous local stream tracks if any
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        });
        videoStream.getVideoTracks().forEach(track => stream.addTrack(track));
      } catch (cameraError: any) {
        setIsCameraDenied(true);
        if (cameraError?.name !== 'NotAllowedError' && cameraError?.name !== 'PermissionDeniedError') {
          setMediaError('Kamera tidak tersedia. Sesi dilanjutkan dengan audio saja.');
        }
      }

      localStreamRef.current = stream;
      if (stream.getVideoTracks().length > 0) {
        setMediaError(null);
        setIsCameraDenied(false);
      } else {
        setMediaError('Kamera tidak tersedia atau izinnya ditolak. Sesi dilanjutkan dengan audio saja.');
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (err: any) {
      console.warn('getUserMedia error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setIsCameraDenied(true);
        setMediaError('Izin akses kamera atau mikrofon ditolak oleh browser.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setMediaError('Kamera atau mikrofon tidak ditemukan pada perangkat Anda.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setMediaError('Kamera atau mikrofon sedang digunakan oleh aplikasi lain.');
      } else {
        setMediaError('Gagal mengakses perangkat kamera/mikrofon.');
      }
      return null;
    }
  }, []);

  // 3. Signaling Helper
  const sendSignal = useCallback(async (type: 'offer' | 'answer' | 'candidate' | 'hangup' | 'screen-state' | 'leave', payload: any) => {
    if (!appointment?.id || userRole === 'guest') return;
    try {
      await apiClient.post(`/api/v1/appointments/${appointment.id}/webrtc/signal`, {
        type,
        payload
      });
    } catch (err) {
      console.warn(`[WebRTC] Failed to send ${type} signal:`, err);
    }
  }, [appointment?.id, userRole]);

  const refreshIceServers = useCallback(async (pc: RTCPeerConnection) => {
    if (!appointment?.id || iceRefreshInFlightRef.current) return;
    iceRefreshInFlightRef.current = true;
    try {
      const response = await apiClient.get<any>(`/api/v1/appointments/${appointment.id}/ice-servers`);
      if (!response.success) {
        if (response.status === 403) setApiAccessDeniedMsg(`Akses sesi ditutup oleh server (${response.error || 'ROOM_ACCESS_DENIED'}).`);
        return;
      }
      const data: any = response.data || response;
      const servers: RTCIceServer[] = data?.iceServers;
      if (!Array.isArray(servers) || servers.length === 0 || pc.connectionState === 'closed') return;
      setIceServers(servers);
      pc.setConfiguration({ ...pc.getConfiguration(), iceServers: servers });
      pc.restartIce();
    } catch (error) {
      console.warn('[WebRTC] Failed to re-authorize ICE configuration:', error);
    } finally {
      iceRefreshInFlightRef.current = false;
    }
  }, [appointment?.id]);

  // 4. WebRTC RTCPeerConnection Setup
  const createPeerConnection = useCallback((customIceServers?: RTCIceServer[]) => {
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) {
        console.warn('Error closing existing peer connection:', e);
      }
      peerConnectionRef.current = null;
    }

    const config: RTCConfiguration = {
      iceServers: customIceServers || iceServers,
      iceCandidatePoolSize: 2
    };

    const pc = new RTCPeerConnection(config);
    peerConnectionRef.current = pc;

    // Attach local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        try {
          pc.addTrack(track, localStreamRef.current!);
        } catch (e) {
          console.warn('Error adding track to peer connection:', e);
        }
      });
    }

    // Remote Track Handler
    pc.ontrack = (event: RTCTrackEvent) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        remoteStreamRef.current = remoteStream;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setHasRemoteStream(true);
      }
    };

    // ICE Candidate Generation
    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        sendSignal('candidate', event.candidate.toJSON());
      }
    };

    // Connection State Handling
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      setConnectionState(state);

      if (state === 'connected') {
        setIsReconnecting(false);
        setRoomPresenceText('Konsultasi Video Terhubung');
      } else if (state === 'connecting') {
        setRoomPresenceText('Menghubungkan sesi peer-to-peer...');
      } else if (state === 'disconnected') {
        setRoomPresenceText('Koneksi terputus. Mencoba menghubungkan kembali...');
        setIsReconnecting(true);
      } else if (state === 'failed') {
        setRoomPresenceText('Koneksi gagal. Mencoba ICE restart...');
        setIsReconnecting(true);
        void refreshIceServers(pc);
      } else if (state === 'closed') {
        setHasRemoteStream(false);
        setRoomPresenceText('Sesi panggilan ditutup.');
      }
    };

    // ICE Connection State Monitoring
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        void refreshIceServers(pc);
      }
    };

    return pc;
  }, [iceServers, refreshIceServers, sendSignal]);

  // 5. Negotiation Initiator
  const initiateOffer = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);
      await sendSignal('offer', offer);
    } catch (err) {
      console.warn('[WebRTC] Failed to create or send offer:', err);
    }
  }, [sendSignal]);

  // 6. Handle Incoming Signals
  const handleIncomingSignal = useCallback(async (signal: { type: string; payload: any; senderId: string }) => {
    let pc = peerConnectionRef.current;
    if (!pc || pc.connectionState === 'closed') {
      pc = createPeerConnection();
    }

    try {
      if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
        
        // Drain pending ICE candidates
        while (pendingIceCandidatesRef.current.length > 0) {
          const candidate = pendingIceCandidatesRef.current.shift();
          if (candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.warn('Error adding queued ICE candidate:', e);
            }
          }
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal('answer', answer);
      } else if (signal.type === 'answer') {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
          
          // Drain pending ICE candidates
          while (pendingIceCandidatesRef.current.length > 0) {
            const candidate = pendingIceCandidatesRef.current.shift();
            if (candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.warn('Error adding queued ICE candidate after answer:', e);
              }
            }
          }
        }
      } else if (signal.type === 'candidate') {
        if (signal.payload) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
            } catch (e) {
              console.warn('Error adding received ICE candidate:', e);
            }
          } else {
            pendingIceCandidatesRef.current.push(signal.payload);
          }
        }
      } else if (signal.type === 'screen-state') {
        setRemoteScreenSharing(!!signal.payload?.isSharing);
      } else if (signal.type === 'hangup' || signal.type === 'leave') {
        setHasRemoteStream(false);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        setRoomPresenceText('Peserta lain telah meninggalkan sesi.');
      }
    } catch (err) {
      console.warn('[WebRTC] Error processing incoming signal:', err);
    }
  }, [createPeerConnection, sendSignal]);

  // 7. Initialize Room & Media on Mount
  useEffect(() => {
    let isSubscribed = true;

    const setupSession = async () => {
      await initLocalMedia();
      if (!isSubscribed) return;

      const pc = createPeerConnection();
      if (userRole === 'konselor' || isInitiatorRef.current) {
        // Counselor or initiator will prepare initial offer
        setTimeout(() => {
          if (isSubscribed && pc.signalingState === 'stable') {
            initiateOffer();
          }
        }, 1000);
      }
    };

    if (appointmentId && roomAccessGranted && !apiAccessDeniedMsg) {
      setupSession();
    }

    return () => {
      isSubscribed = false;
      // Cleanup all media tracks on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      if (peerConnectionRef.current) {
        try {
          peerConnectionRef.current.close();
        } catch (e) {
          console.warn('Error closing peer connection on unmount:', e);
        }
        peerConnectionRef.current = null;
      }
      sendSignal('leave', {});
    };
  }, [appointmentId, roomAccessGranted, apiAccessDeniedMsg, initLocalMedia, createPeerConnection, initiateOffer, sendSignal, userRole]);

  useEffect(() => {
    if (!apiAccessDeniedMsg) return;
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current = null;
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
  }, [apiAccessDeniedMsg]);

  // 8. Signaling Polling Loop
  useEffect(() => {
    if (!appointment?.id || userRole === 'guest' || apiAccessDeniedMsg) return;

    let isCancelled = false;

    const pollSignals = async () => {
      try {
        const res = await apiClient.get<any>(
          `/api/v1/appointments/${appointment.id}/webrtc/signals?since=${lastSignalTimeRef.current}`
        );
        if (isCancelled) return;

        const rawData: any = res?.data || res;
        const signals = rawData?.signals;
        const serverTime = rawData?.serverTime;

        if (!res.success && res.status === 403) {
          setApiAccessDeniedMsg(`Akses sesi ditutup oleh server (${res.error || 'ROOM_ACCESS_DENIED'}).`);
          return;
        }

        if (res.success && Array.isArray(signals)) {
          for (const signal of signals) {
            if (signal.timestamp > lastSignalTimeRef.current) {
              lastSignalTimeRef.current = signal.timestamp;
            }
            await handleIncomingSignal(signal);
          }
          if (serverTime && serverTime > lastSignalTimeRef.current) {
            lastSignalTimeRef.current = Math.max(lastSignalTimeRef.current, serverTime - 5000);
          }
        }
      } catch (e) {
        console.warn('Signal polling error:', e);
      }
    };

    const interval = setInterval(pollSignals, 1500);
    pollSignals();

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [appointment?.id, userRole, apiAccessDeniedMsg, handleIncomingSignal]);

  // 9. 45-Minute Countdown Timer
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

  // 10. Room Presence Heartbeat Loop
  useEffect(() => {
    if (!appointment?.id || userRole === 'guest' || apiAccessDeniedMsg) return;

    let isSubscribed = true;

    const pingRoom = async () => {
      try {
        const presenceRes = await apiClient.post(`/api/v1/appointments/${appointment.id}/room-presence`, {
          isScreenSharing,
          networkQuality
        });
        if (!presenceRes.success && presenceRes.status === 403) {
          setApiAccessDeniedMsg(`Akses sesi ditutup oleh server (${presenceRes.error || 'ROOM_ACCESS_DENIED'}).`);
          return;
        }

        const statusRes = await apiClient.get<any>(`/api/v1/appointments/${appointment.id}/room-presence`);
        if (!isSubscribed) return;
        if (!statusRes.success && statusRes.status === 403) {
          setApiAccessDeniedMsg(`Akses sesi ditutup oleh server (${statusRes.error || 'ROOM_ACCESS_DENIED'}).`);
          return;
        }

        if (statusRes.success && statusRes.data) {
          setParticipantCount(statusRes.data.participantCount || 1);
          setHasCounselorJoined(statusRes.data.hasCounselor || userRole === 'konselor');
          setHasStudentJoined(statusRes.data.hasStudent || userRole === 'mahasiswa');
          
          if (connectionState !== 'connected') {
            setRoomPresenceText(statusRes.data.statusText || 'Menghubungkan ke ruangan...');
          }
        }
      } catch (e) {
        console.warn('Room presence heartbeat error:', e);
      }
    };

    pingRoom();
    const interval = setInterval(pingRoom, 5000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      apiClient.post(`/api/v1/appointments/${appointment.id}/room-presence`, { action: 'leave' }).catch(() => {});
    };
  }, [appointment?.id, userRole, apiAccessDeniedMsg, isScreenSharing, networkQuality, connectionState]);

  // 11. In-Call Notes Synchronization
  useEffect(() => {
    if (!appointment?.id || userRole === 'guest' || apiAccessDeniedMsg) return;

    let isSubscribed = true;

    const fetchNotes = async () => {
      try {
        const res = await apiClient.get<any>(`/api/v1/appointments/${appointment.id}/in-call-notes`);
        if (!isSubscribed) return;

        if (res.success && res.data) {
          if (!isInCallNotesOpen && res.data.sharedContent !== undefined) {
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
    const notesInterval = setInterval(fetchNotes, 6000);
    return () => {
      isSubscribed = false;
      clearInterval(notesInterval);
    };
  }, [appointment?.id, userRole, isInCallNotesOpen, apiAccessDeniedMsg]);

  // Handle In-Call Shared Notes Debounced Update
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
    }, 1000);
  };

  // 12. Media Controls: Mute Toggle
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !nextMuted;
      });
    }
  };

  // Media Controls: Video Toggle
  const handleToggleVideo = () => {
    const nextVideoOff = !isVideoOff;
    setIsVideoOff(nextVideoOff);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !nextVideoOff;
      });
    }
  };

  // 13. Screen Sharing Management with Seamless Camera Restoration
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop Screen Share & Restore Camera
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);

      // Restore camera track to RTCPeerConnection sender
      const pc = peerConnectionRef.current;
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
      if (pc && cameraTrack) {
        const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          try {
            await videoSender.replaceTrack(cameraTrack);
          } catch (e) {
            console.warn('Error restoring camera track to sender:', e);
          }
        }
      }

      sendSignal('screen-state', { isSharing: false });
    } else {
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          alert('Berbagi layar tidak didukung pada browser/perangkat ini.');
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

        const screenTrack = stream.getVideoTracks()[0];

        // Replace track on WebRTC sender if active
        const pc = peerConnectionRef.current;
        if (pc && screenTrack) {
          const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (videoSender) {
            try {
              await videoSender.replaceTrack(screenTrack);
            } catch (e) {
              console.warn('Error replacing track with screen track on sender:', e);
            }
          }
        }

        sendSignal('screen-state', { isSharing: true });

        // Handle user clicking "Stop Sharing" from browser native chrome
        screenTrack.onended = async () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;

          const activePc = peerConnectionRef.current;
          const camTrack = localStreamRef.current?.getVideoTracks()[0];
          if (activePc && camTrack) {
            const videoSender = activePc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (videoSender) {
              try {
                await videoSender.replaceTrack(camTrack);
              } catch (e) {
                console.warn('Error restoring camera track on screenTrack onended:', e);
              }
            }
          }
          sendSignal('screen-state', { isSharing: false });
        };
      } catch (err: any) {
        // User cancelled picker or permission error (AbortError / NotAllowedError)
        console.warn('Screen share cancelled or failed:', err);
        setIsScreenSharing(false);
      }
    }
  };

  // Reconnect Trigger Button Handler
  const handleManualReconnect = async () => {
    setIsReconnecting(true);
    setRoomPresenceText('Melakukan koneksi ulang WebRTC...');
    createPeerConnection();
    if (userRole === 'konselor') {
      setTimeout(() => initiateOffer(), 500);
    }
  };

  // Device Change Listener (Headphone / Mic / Camera plugin)
  useEffect(() => {
    const handleDeviceChange = async () => {
      console.info('[WebRTC] Media device change detected.');
    };

    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    }
  }, []);

  // Format Countdown Timer
  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEscapeKey(() => {
    // Prevent accidental close on Escape key
  }, true);

  if (!appointment) return null;

  // Access Denial Screen (403, Cancelled, Rejected, or Guest)
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
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      sendSignal('hangup', {});
      onEndCall(appointment.id, counselorNotes);
      onClose();
    }
  };

  const isFiveMinWarning = sessionSecondsLeft <= 300 && sessionSecondsLeft > 0;
  const isWebRtcConnected = connectionState === 'connected';

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
                    WebRTC ICE ({connectionState})
                  </span>
                ) : iceServersError ? (
                  <span className="text-[10px] text-rose-400 font-normal bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                    WebRTC Error
                  </span>
                ) : null}
              </span>
              <span className="text-slate-400 text-[11px] flex items-center gap-1.5 mt-0.5 pointer-events-auto">
                <span className={`w-2 h-2 rounded-full ${isWebRtcConnected ? 'bg-emerald-400 animate-pulse' : isReconnecting ? 'bg-rose-400 animate-ping' : 'bg-amber-400 animate-ping'}`} />
                {roomPresenceText}
                {isReconnecting && (
                  <button 
                    onClick={handleManualReconnect}
                    className="ml-2 inline-flex items-center gap-1 text-[10px] text-amber-300 hover:text-amber-200 underline cursor-pointer"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Reconnect
                  </button>
                )}
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

          {/* Media Permission Warning Banner */}
          {mediaError && (
            <div className="pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs shadow-lg animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Perhatian Media:</strong> {mediaError}
                </span>
              </div>
              <button
                onClick={initLocalMedia}
                className="cursor-pointer text-[11px] bg-rose-900/60 hover:bg-rose-800 text-white px-2.5 py-1 rounded-lg border border-rose-600/40 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          )}

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

          {/* Consultation Active Banner */}
          {showSimNotice && !isFiveMinWarning && !mediaError && (
            <div className="pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 backdrop-blur-md shadow-lg text-xs text-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <p className="leading-relaxed text-[11px] sm:text-xs">
                  <strong className="text-emerald-400 font-semibold">Ruang Tele-Konseling WebRTC:</strong> Sesi video peer-to-peer terenkripsi, mendukung presentasi layar skripsi & catatan kolaboratif real-time.
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
                muted
                className="w-full h-full object-contain bg-black"
              />
              <div className="absolute top-4 left-4 bg-indigo-950/80 backdrop-blur px-3 py-1.5 rounded-xl text-white text-xs font-semibold flex items-center gap-2 border border-indigo-500/40">
                <ScreenShare className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span>Presentasi Layar Anda Aktif</span>
              </div>
            </div>
          ) : (
            <>
              {/* Remote Video Participant (Konselor / Mahasiswa) */}
              <div className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center group">
                <video 
                  ref={remoteVideoRef}
                  autoPlay 
                  playsInline 
                  className={`absolute inset-0 w-full h-full object-cover ${hasRemoteStream ? 'block' : 'hidden'}`}
                />

                {/* Placeholder when remote stream is not yet active */}
                {!hasRemoteStream && (
                  <div className="flex flex-col items-center justify-center space-y-3 p-6 text-center">
                    <img 
                      src={userRole === 'mahasiswa' ? (appointment.counselorAvatar || "https://api.dicebear.com/9.x/avataaars/svg?seed=Counselor&backgroundColor=b6e3f4") : "https://api.dicebear.com/9.x/avataaars/svg?seed=Student&backgroundColor=b6e3f4"}
                      alt="Remote Participant"
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-slate-700 opacity-80 object-cover"
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">
                        {userRole === 'mahasiswa' ? appointment.counselorName : appointment.studentName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {isWebRtcConnected ? 'Mempersiapkan video rekan...' : (hasCounselorJoined || hasStudentJoined) ? 'Menunggu koneksi video peer-to-peer...' : 'Menunggu peserta bergabung...'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl text-white text-xs sm:text-sm font-medium flex items-center gap-2 border border-slate-700/60 z-10">
                  <span className={`w-2 h-2 rounded-full ${hasRemoteStream ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {userRole === 'mahasiswa' ? appointment.counselorName : appointment.studentName}
                  {remoteScreenSharing && (
                    <span className="text-[10px] text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30 flex items-center gap-1">
                      <ScreenShare className="w-3 h-3" /> Berbagi Layar
                    </span>
                  )}
                </div>
              </div>

              {/* Local User Video */}
              <div className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
                {isVideoOff || isCameraDenied ? (
                  <div className="w-24 h-24 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                    <UserIcon />
                  </div>
                ) : (
                  <video 
                    ref={localVideoRef}
                    autoPlay 
                    muted 
                    playsInline 
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                  />
                )}
                <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-xl text-white text-xs sm:text-sm font-medium flex items-center gap-2 border border-slate-700/60 z-10">
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
            onClick={handleToggleMute}
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
            onClick={handleToggleVideo}
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
                className="text-slate-400 hover:text-white p-1 rounded-lg text-xs cursor-pointer"
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
