import twilio from 'twilio';

// Lazy initialization for Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client: twilio.Twilio | null = null;
try {
  if (accountSid && authToken && twilioPhoneNumber) {
    client = twilio(accountSid, authToken);
  }
} catch (error) {
  // Silent catch without dumping credentials
}

export interface SOSPayload {
  studentName?: string;
  emergencyContact: string;
  location?: any;
  crisisSignal: string;
}

export type SOSStatus = 'delivered' | 'failed' | 'not_configured' | 'mock_mode';

function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 6) return '****';
  return phone.slice(0, 4) + '****' + phone.slice(-3);
}

export async function sendEmergencySOS(payload: SOSPayload): Promise<{ status: SOSStatus; message: string; error?: string }> {
  try {
    const timeTriggered = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const studentInfo = payload.studentName ? `Mahasiswa: ${payload.studentName}` : 'Seorang mahasiswa anonim';
    
    let locStr = 'Lokasi: Kampus Utama';
    if (payload.location) {
      if (typeof payload.location === 'string') {
        locStr = `Lokasi Terakhir: ${payload.location}`;
      } else if (typeof payload.location === 'object') {
        locStr = `Lokasi Terakhir: ${payload.location.address || 'Diketahui dari GPS'}`;
      }
    }
    
    const messageBody = `🚨 *DARURAT RUANGTENANG KAMPUS* 🚨\nSinyal SOS telah diaktifkan.\n${studentInfo}\nSinyal Krisis: ${payload.crisisSignal}\nWaktu Pemicuan: ${timeTriggered} WIB\n${locStr}\nSegera hubungi mahasiswa terkait.`;

    const maskedRecipient = maskPhoneNumber(payload.emergencyContact);

    if (client && twilioPhoneNumber) {
      await client.messages.create({
        body: messageBody,
        from: twilioPhoneNumber,
        to: payload.emergencyContact
      });
      console.log(`[SOS GATEWAY] Emergency alert dispatched to ${maskedRecipient}`);
      return { status: 'delivered', message: 'Sinyal darurat berhasil dikirim via SMS/WhatsApp.' };
    }

    if (!accountSid || !authToken) {
      return { status: 'not_configured', message: 'Layanan darurat belum dikonfigurasi oleh admin.' };
    }

    console.log(`[SOS GATEWAY] Local simulation mode to ${maskedRecipient}`);
    return { status: 'mock_mode', message: 'Simulasi pesan darurat dicatat di sistem lokal.' };

  } catch (error: any) {
    console.error('[SOS GATEWAY] Failed to dispatch emergency alert');
    return { status: 'failed', message: 'Gagal mengirim pesan darurat.', error: error.message };
  }
}

export interface SosAlertData {
  userId: string;
  studentName: string;
  triggers: string[];
  action: string;
  timestamp: string;
}

export async function dispatchSosAlert(data: SosAlertData): Promise<{ status: SOSStatus; message: string; error?: string }> {
  const alertMessage = `🚨 DARURAT RUANGTENANG 🚨\n\nMahasiswa: ${data.studentName}\nKondisi Krisis Terdeteksi.\nSistem mendeteksi pola percakapan: ${data.triggers.join(', ')}.\n\nTindakan Rekomendasi: ${data.action}\nWaktu: ${data.timestamp}`;
  
  if (!client) {
    if (!accountSid || !authToken) {
      return { status: 'not_configured', message: 'Layanan darurat belum dikonfigurasi.' };
    }
    return { status: 'mock_mode', message: 'Simulasi pengiriman otomatis.' };
  }

  try {
    const hotline = process.env.HOTLINE_PHONE_NUMBER;
    if (!hotline) {
      return { status: 'not_configured', message: 'Nomor hotline kampus belum dikonfigurasi.' };
    }
    await client.messages.create({
      body: alertMessage,
      from: twilioPhoneNumber,
      to: hotline,
    });
    return { status: 'delivered', message: 'Peringatan krisis berhasil dikirim ke satgas kampus.' };
  } catch (error: any) {
    return { status: 'failed', message: 'Sinyal SOS gagal dikirim.', error: error.message };
  }
}
