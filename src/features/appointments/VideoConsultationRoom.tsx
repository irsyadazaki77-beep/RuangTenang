import React, { useState, useEffect, useRef } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { Video, VideoOff, Mic, MicOff, PhoneOff, AlertCircle, Lock, Users, Network, Maximize } from 'lucide-react';
import { Appointment } from '../../types';

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
  const [counselorNotes, setCounselorNotes] = useState('');
  const [networkQuality, setNetworkQuality] = useState<'good' | 'poor'>('good');
  
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

  const handleEndCall = () => {
    // Prompt confirmation maybe?
    if (window.confirm('Apakah Anda yakin ingin mengakhiri sesi video ini?')) {
      onEndCall(appointment.id, counselorNotes);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex animate-in fade-in duration-300 h-[100dvh] w-full overflow-hidden">
      {/* Main Video Area */}
      <div className={`flex-1 flex flex-col relative transition-all duration-300 ${userRole === 'konselor' ? 'lg:mr-[320px]' : ''}`}>
        
        {/* Top Overlay Bar */}
        <div className="absolute top-0 left-0 w-full p-4 flex items-center justify-between z-10 bg-gradient-to-b from-slate-900/80 to-transparent pointer-events-none">
          <div className="flex flex-col">
            <span className="text-white font-semibold flex items-center gap-2 pointer-events-auto">
              <Lock className="w-4 h-4 text-emerald-400" />
              Sesi Terenkripsi End-to-End
            </span>
            <span className="text-slate-300 text-xs">ID: {appointment.id}</span>
          </div>
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/80 backdrop-blur border ${networkQuality === 'good' ? 'border-emerald-500/50 text-emerald-400' : 'border-amber-500/50 text-amber-400'}`}>
              <Network className="w-3.5 h-3.5" />
              {networkQuality === 'good' ? 'Sinyal Stabil' : 'Sinyal Lemah'}
            </div>
            <div className="px-2.5 py-1 rounded-full bg-slate-800/80 backdrop-blur border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> 2 Partisipan
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-2 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4 mt-16 mb-20 relative">
          
          {/* Remote Video (Mock) */}
          <div className="relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center group">
            <img 
              src={userRole === 'mahasiswa' ? appointment.counselorAvatar : "https://api.dicebear.com/9.x/avataaars/svg?seed=Student&backgroundColor=b6e3f4"}
              alt="Remote Participant"
              className="w-32 h-32 rounded-full opacity-50 blur-[2px] transition-all group-hover:blur-none group-hover:opacity-100 object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-slate-900/60 backdrop-blur px-3 py-1.5 rounded-lg text-white text-sm font-medium flex items-center gap-2">
              {userRole === 'mahasiswa' ? appointment.counselorName : appointment.studentName}
            </div>
          </div>

          {/* Local Video (Mock) */}
          <div className="relative bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex items-center justify-center">
            {isVideoOff ? (
               <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center">
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
                    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                      .then(stream => { el.srcObject = stream; })
                      .catch(err => console.warn('Camera error:', err));
                  }
                }}
              />
            )}
            <div className="absolute bottom-4 left-4 bg-slate-900/60 backdrop-blur px-3 py-1.5 rounded-lg text-white text-sm font-medium flex items-center gap-2">
              Anda {isMuted && <MicOff className="w-3.5 h-3.5 text-rose-500" />}
            </div>
          </div>
        </div>

        {/* Bottom Controls Bar */}
        <div className="absolute bottom-0 left-0 w-full h-20 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex items-center justify-center gap-4 sm:gap-6 px-4">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-rose-500/20 text-rose-500 hover:bg-rose-500/30' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          <button 
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-rose-500/20 text-rose-500 hover:bg-rose-500/30' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          <button 
            onClick={handleEndCall}
            className="w-16 h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/20 transition-all"
            title="Akhiri Panggilan"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Counselor Side Panel */}
      {userRole === 'konselor' && (
        <div className="hidden lg:flex w-[320px] bg-white border-l border-slate-200 h-full flex-col shadow-2xl absolute right-0 top-0">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Catatan Klinis (Privat)</h3>
              <p className="text-[10px] text-slate-500">Tersimpan aman & terenkripsi</p>
            </div>
          </div>
          
          <div className="flex-1 p-4 bg-white flex flex-col">
            <div className="mb-3 space-y-1">
              <label className="text-xs font-semibold text-slate-700">Keluhan Mahasiswa:</label>
              <div className="p-2.5 bg-slate-100 rounded-lg text-xs text-slate-800 font-medium">
                {appointment.primaryConcern}
              </div>
            </div>
            <textarea
              className="flex-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none transition-all placeholder:text-slate-400"
              placeholder="Ketik catatan medis, observasi emosional, dan saran coping selama sesi berlangsung di sini..."
              value={counselorNotes}
              onChange={(e) => setCounselorNotes(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

function UserIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
