# RuangTenang Kampus - API Documentation

Dokumentasi resmi REST API dan Streaming Server-Sent Events (SSE) untuk platform kesehatan mental **RuangTenang Kampus** (Node.js + Express + TypeScript + Prisma).

---

## 1. Overview & Konvensi

### 1.1 Base URL
- **Production / Staging Base Path**: `/api/v1`
- *Catatan Backward Compatibility*: Beberapa endpoint juga dialiaskan pada prefix `/api/*` demi kompatibilitas klien lama.

### 1.2 Format Data & Headers
- **Content-Type**: `application/json` (Kecuali endpoint SSE: `text/event-stream` dan Download Data: `application/json; attachment`).
- **Standard Response Header**:
  - `x-request-id`: UUID unik pelacakan log & audit request.
  - `Cache-Control`: `no-store, no-cache, must-revalidate` (pada seluruh data sensitif).

### 1.3 Authentication & Authorization
Autentikasi menggunakan **JSON Web Token (JWT)** dengan mekanisme ganda:
1. **HTTP-only Cookie** (Rekomendasi Web): Cookie bernama `session_token` / `token` (`SameSite: Lax/None`, `Secure`, `HttpOnly`).
2. **Bearer Token Header** (Mobile / External Client):
   ```http
   Authorization: Bearer <jwt_token>
   ```
3. **Role Akses**:
   - `mahasiswa`: Akses data pribadi, riwayat chat AI, booking janji temu, asesmen mandiri, SOS.
   - `konselor`: Manajemen janji temu terdelegasi, audit skrining berizin, dasbor analitik & alert risiko.
   - `admin`: Manajemen penuh sistem, audit platform, eksekusi kebijakan retensi.
   - `guest`: Akses terbatas (chat AI anonim kuota ketat, info hotline darurat, direktori konselor).

### 1.4 Format Response Standar

#### Success Response
```json
{
  "success": true,
  "data": {},
  "message": "Operasi berhasil",
  "requestId": "req_9f8e7d6c5b"
}
```

#### Error Response
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "error": "Pesan deskripsi kesalahan yang mudah dipahami.",
  "details": [
    {
      "path": "email",
      "message": "Format email tidak valid"
    }
  ],
  "requestId": "req_9f8e7d6c5b"
}
```

### 1.5 Rate Limiting Overview
- **General API**: 100 request / menit per IP.
- **Auth (Login/Register/MFA)**: 5–10 percobaan gagal per jendela 15 menit.
- **AI Chat & Streaming**: Pembatasan harian berdasarkan *Role/Tier* (Free vs Premium) serta anti-abuse prompt injection scanner.
- **SOS Dispatch**: Maksimal 2 pemicuan per 15 menit dengan *cooldown* 3 menit.
- **Client Telemetry**: Maksimal 30 request / 15 menit.

---

## 2. Authentication API (`/auth`)

### 2.1 Register Akun
- **Method & Path**: `POST /auth/register`
- **Deskripsi**: Mendaftarkan akun mahasiswa atau staf baru.
- **Auth Required**: Tidak (Publik)
- **Request Body**:
  ```json
  {
    "name": "Budi Pratama",
    "email": "budi@kampus.ac.id",
    "password": "PasswordKuat123!",
    "university": "Universitas Indonesia",
    "role": "mahasiswa"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "usr_12345",
      "name": "Budi Pratama",
      "email": "budi@kampus.ac.id",
      "role": "mahasiswa",
      "tier": "Free"
    },
    "message": "Registrasi berhasil."
  }
  ```
- **Possible Errors**:
  - `400 EMAIL_ALREADY_REGISTERED`: Email sudah terdaftar.
  - `400 VALIDATION_ERROR`: Format email/password tidak memenuhi syarat.

---

### 2.2 Login
- **Method & Path**: `POST /auth/login`
- **Deskripsi**: Masuk ke akun. Menyetel cookie sesi HTTP-Only atau mengembalikan flag verifikasi 2FA/MFA jika aktif.
- **Auth Required**: Tidak (Publik)
- **Request Body**:
  ```json
  {
    "email": "budi@kampus.ac.id",
    "password": "PasswordKuat123!"
  }
  ```
- **Success Response (200 OK - Direct)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "usr_12345",
      "name": "Budi Pratama",
      "email": "budi@kampus.ac.id",
      "role": "mahasiswa",
      "tier": "Free"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Success Response (200 OK - MFA Challenge)**:
  ```json
  {
    "success": true,
    "mfaRequired": true,
    "mfaToken": "mfa_challenge_abc123"
  }
  ```
- **Possible Errors**:
  - `401 INVALID_CREDENTIALS`: Email atau kata sandi salah.
  - `429 RATE_LIMIT_EXCEEDED`: Terlalu banyak percobaan login gagal.

---

### 2.3 Verifikasi MFA (2FA)
- **Method & Path**: `POST /auth/mfa/verify`
- **Deskripsi**: Memvalidasi kode 6-digit TOTP / email MFA setelah login tahap pertama.
- **Auth Required**: Tidak (Menggunakan `mfaToken`)
- **Request Body**:
  ```json
  {
    "mfaToken": "mfa_challenge_abc123",
    "code": "123456"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": { "id": "usr_12345", "name": "Budi Pratama", "email": "budi@kampus.ac.id", "role": "mahasiswa" }
  }
  ```
- **Possible Errors**:
  - `400 INVALID_MFA_CODE`: Kode verifikasi salah atau kedaluwarsa.

---

### 2.4 Get Current User (Me)
- **Method & Path**: `GET /auth/me`
- **Deskripsi**: Mendapatkan info profil user sesi aktif.
- **Auth Required**: Ya (Opsional fallback ke Guest jika belum login)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "usr_12345",
      "name": "Budi Pratama",
      "email": "budi@kampus.ac.id",
      "role": "mahasiswa",
      "tier": "Free"
    }
  }
  ```
- **Possible Errors**:
  - `401 UNAUTHORIZED`: Sesi kedaluwarsa atau token tidak valid.

---

### 2.5 Logout
- **Method & Path**: `POST /auth/logout`
- **Deskripsi**: Menghapus token sesi aktif dan membersihkan cookie autentikasi di browser.
- **Auth Required**: Ya / Opsional
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Berhasil keluar dari sesi."
  }
  ```

---

## 3. Chat API & Real-time AI (`/chat`)

### 3.1 Daftar Model AI yang Tersedia
- **Method & Path**: `GET /chat/models`
- **Deskripsi**: Mendapatkan daftar model AI (Gemini 2.5 Flash, Gemini 2.5 Pro, Flash-Lite) beserta status tier aksesnya.
- **Auth Required**: Tidak
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "models": [
      {
        "id": "gemini-3.8-flash",
        "name": "Gemini 3.8 Flash (via Gemini 2.5 Engine)",
        "tag": "Terbaru • Cepat & Cerdas",
        "speed": "Sangat Cepat",
        "isDefault": true,
        "allowedTiers": ["Free", "Plus", "Campus_Partner"]
      }
    ]
  }
  ```

---

### 3.2 Streaming Percakapan AI (Server-Sent Events)
- **Method & Path**: `POST /chat/stream`
- **Deskripsi**: Endpoint streaming percakapan interaktif AI pendamping konseling menggunakan Server-Sent Events (SSE). Terintegrasi dengan PII filter, deteksi krisis otomatis, memori personal, dan clinical fallback.
- **Auth Required**: Opsional (Mendukung Mahasiswa terdaftar & Sesi Tamu/Guest).
- **Headers**:
  - `Accept`: `text/event-stream`
  - `Content-Type`: `application/json`
- **Request Body**:
  ```json
  {
    "message": "Aku cemas banget dengan sidang skripsi minggu depan...",
    "chatId": "chat_1726000000",
    "chatMode": "counseling",
    "responseStyle": "warm",
    "aiModel": "gemini-3.8-flash",
    "isTemporary": false,
    "attachments": []
  }
  ```

#### Cara Kerja SSE pada `/chat/stream`
1. Server segera merespons dengan header `Content-Type: text/event-stream` dan `Connection: keep-alive`.
2. AI menghasilkan teks secara bertahap dalam bentuk chunk string.
3. Setiap potongan data dikirim dengan format `data: <JSON_STRING>\n\n`.
4. Stream selesai ditandai dengan event `done: true` dan penutup `data: [DONE]\n\n`.

#### Tipe Event / Payload Data yang Dikirim

1. **Text Chunk (Teks respons bertahap)**:
   ```http
   data: {"text":"Halo Budi, wajar sekali "}

   data: {"text":"merasa cemas menjelang sidang. "}
   ```

2. **Tool / Plugin Invocation (Pemanggilan alat internal seperti latihan pernapasan/jadwal)**:
   ```http
   data: {"tool_call":"breathing_exercise","parameters":{"technique":"4-7-8","duration":120}}
   ```

3. **Auto Title (Untuk percakapan baru)**:
   ```http
   data: {"newTitle":"Kecemasan Sidang Skripsi"}
   ```

4. **Selesai (Stream Completion)**:
   ```http
   data: {"done":true,"chatId":"chat_1726000000"}

   data: [DONE]
   ```

5. **Limit Reached / Safety Override**:
   ```http
   data: {"error":"DAILY_LIMIT_EXCEEDED","text":"⚠️ Batas penggunaan AI harian Anda telah tercapai."}

   data: [DONE]
   ```

#### Cara Handle Error di Stream (Frontend Client Guideline)
- **Network Interruption / Abort**: Pasang listener `AbortController` pada `fetch`. Bila user membatalkan, panggil `abortController.abort()`.
- **Parsing JSON Chunk**: Lakukan split per baris `\n\n`, filter prefix `data: `, abaikan bila `data: [DONE]`, lalu `JSON.parse(dataStr)`.
- **Fallback Handling**: Jika server mengalami kendala koneksi ke LLM upstream, server otomatis mengirimkan teks pendamping lokal (*local clinical safety response*) sehingga UI tidak macet.

---

### 3.3 Riwayat Percakapan Pengguna
- **Method & Path**: `GET /chat/history`
- **Deskripsi**: Mengambil daftar sesi chat pengguna yang tersimpan (termasuk status pin, archive, dan cuplikan terakhir).
- **Auth Required**: Ya (`mahasiswa`, `admin`)
- **Query Params**: `page` (default: 1), `limit` (default: 30)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "chats": [
      {
        "id": "chat_1726000000",
        "title": "Kecemasan Sidang Skripsi",
        "isPinned": true,
        "isArchived": false,
        "updatedAt": "2026-09-14T10:00:00.000Z",
        "messageCount": 8
      }
    ]
  }
  ```

---

### 3.4 Ambil Pesan dalam Satu Sesi Percakapan
- **Method & Path**: `GET /chat/:id/messages`
- **Deskripsi**: Mengambil seluruh pesan terenkripsi yang telah didekripsi untuk sesi percakapan milik pengguna.
- **Auth Required**: Ya (Milik pemilik chat)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "chatId": "chat_1726000000",
    "messages": [
      {
        "id": "msg_001",
        "role": "user",
        "content": "Aku cemas dengan skripsi...",
        "createdAt": "2026-09-14T10:00:00.000Z"
      },
      {
        "id": "msg_002",
        "role": "assistant",
        "content": "Halo, wajar sekali merasa tegang...",
        "createdAt": "2026-09-14T10:00:02.000Z"
      }
    ]
  }
  ```

---

### 3.5 Generate Ringkasan Sesi AI (Session Summary)
- **Method & Path**: `POST /chat/:id/summary`
- **Deskripsi**: Menganalisis dan menyusun ringkasan percakapan klinis (poin emosi utama, insight, dan rekomendasi langkah tindak lanjut) menggunakan AI.
- **Auth Required**: Ya
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "summary": {
      "keyIssues": ["Kecemasan akademik", "Gangguan pola tidur"],
      "moodProgress": "Dari gelisah menuju lebih tenang",
      "actionItems": ["Latihan teknik pernapasan 4-7-8 sebelum tidur", "Bagi bab skripsi menjadi target kecil"],
      "generatedAt": "2026-09-14T10:15:00.000Z"
    }
  }
  ```

---

### 3.6 Manajemen Memori Personal Pengguna (`/chat/user-memories`)
- **Method & Path**: 
  - `GET /chat/user-memories` (Ambil daftar memori aktif)
  - `POST /chat/user-memories` (Simpan memori preferensi baru)
  - `DELETE /chat/user-memories/:id` (Hapus memori tertentu)
- **Auth Required**: Ya
- **Request Body (POST)**:
  ```json
  {
    "content": "Sedang menyusun skripsi jurusan Teknik Informatika di Universitas Indonesia"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "memory": {
      "id": "mem_17260001",
      "content": "Sedang menyusun skripsi jurusan Teknik Informatika di Universitas Indonesia",
      "isActive": true
    }
  }
  ```

---

## 4. Appointments API (`/appointments`)

### 4.1 Cek Ketersediaan Slot Konselor
- **Method & Path**: `GET /appointments/availability`
- **Deskripsi**: Memeriksa slot jam yang masih tersedia untuk konselor pada tanggal tertentu.
- **Auth Required**: Tidak
- **Query Params**:
  - `counselorId` (wajib, contoh: `c-1`)
  - `date` (wajib, format `YYYY-MM-DD`, contoh: `2026-09-20`)
- **Success Response (200 OK)**:
  ```json
  {
    "counselorId": "c-1",
    "date": "2026-09-20",
    "availableSlots": ["09:00", "11:00", "14:00", "16:00"],
    "bookedSlots": ["10:00", "13:00"]
  }
  ```

---

### 4.2 Buat Janji Temu Konseling Baru
- **Method & Path**: `POST /appointments`
- **Deskripsi**: Mahasiswa melakukan booking jadwal konseling dengan konselor kampus.
- **Auth Required**: Ya (`mahasiswa`)
- **Request Body**:
  ```json
  {
    "counselorId": "c-1",
    "counselorName": "Dr. Anita Rahmawati, M.Psi.",
    "date": "2026-09-20",
    "time": "14:00",
    "timezone": "WIB",
    "mode": "video_call",
    "notes": "Konsultasi mengenai kecemasan dan motivasi belajar",
    "studentNIM": "1906123456"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "record": {
      "id": "apt_1726000000",
      "counselorId": "c-1",
      "counselorName": "Dr. Anita Rahmawati, M.Psi.",
      "date": "2026-09-20",
      "time": "14:00",
      "timezone": "WIB",
      "status": "PENDING",
      "approvalStatus": "PENDING_APPROVAL",
      "attendanceStatus": "SCHEDULED",
      "mode": "video_call",
      "studentName": "Budi Pratama"
    }
  }
  ```
- **Possible Errors**:
  - `409 SLOT_ALREADY_BOOKED`: Slot pada tanggal dan jam tersebut sudah dipesan mahasiswa lain.
  - `400 VALIDATION_ERROR`: Data tidak lengkap atau tanggal di masa lalu.

---

### 4.3 Ambil Daftar Janji Temu
- **Method & Path**: `GET /appointments`
- **Deskripsi**: Mengambil daftar janji temu dengan isolasi data otomatis sesuai role (mahasiswa hanya melihat jadwal miliknya, konselor melihat jadwal konselinya, admin melihat semua).
- **Auth Required**: Ya
- **Query Params**: `page`, `limit`, `status`, `date`, `search`, `format` (`array` atau `object`)
- **Success Response (200 OK - Object format)**:
  ```json
  {
    "data": [
      {
        "id": "apt_1726000000",
        "counselorName": "Dr. Anita Rahmawati, M.Psi.",
        "date": "2026-09-20",
        "time": "14:00",
        "status": "CONFIRMED",
        "approvalStatus": "APPROVED",
        "meetingLink": "https://meet.google.com/abc-defg-hij"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
  ```

---

### 4.4 Update / Konfirmasi Janji Temu
- **Method & Path**: `PUT /appointments/:id`
- **Deskripsi**: Memperbarui detail janji temu. Konselor dapat menyetujui (`status: CONFIRMED`) dan menambahkan link video. Mahasiswa dapat membatalkan (`status: CANCELLED`).
- **Auth Required**: Ya (`konselor`, `admin`, `mahasiswa`)
- **Request Body (Contoh Konselor)**:
  ```json
  {
    "status": "CONFIRMED",
    "approvalStatus": "APPROVED",
    "meetingLink": "https://meet.google.com/abc-defg-hij",
    "notes": "Sesi disetujui, silakan bergabung 5 menit sebelum waktu."
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "record": { "id": "apt_1726000000", "status": "CONFIRMED", "approvalStatus": "APPROVED" }
  }
  ```

---

### 4.5 Reschedule Janji Temu
- **Method & Path**: `POST /appointments/:id/reschedule`
- **Deskripsi**: Mengajukan jadwal baru untuk janji temu yang ada.
- **Auth Required**: Ya
- **Request Body**:
  ```json
  {
    "date": "2026-09-22",
    "time": "10:00",
    "timezone": "WIB",
    "reason": "Bentrok dengan jadwal ujian praktikum"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Jadwal janji temu berhasil dijadwalkan ulang.",
    "record": { "id": "apt_1726000000", "date": "2026-09-22", "time": "10:00", "status": "PENDING" }
  }
  ```

---

### 4.6 Real-Time Appointment Event Stream
- **Method & Path**: `GET /appointments/stream`
- **Deskripsi**: SSE stream untuk sinkronisasi pembaruan status janji temu (persetujuan, perubahan link, reschedule) secara instan ke klien.
- **Auth Required**: Ya

---

## 5. Screening & Psychological Assessment API (`/screenings`)

### 5.1 Kirim Hasil Skrining (PHQ-9 & GAD-7)
- **Method & Path**: `POST /screenings`
- **Deskripsi**: Menyimpan hasil asesmen depresi (PHQ-9) dan kecemasan (GAD-7) dengan perhitungan tingkat keparahan dan deteksi risiko *self-harm* otomatis.
- **Auth Required**: Ya (`mahasiswa`)
- **Request Body**:
  ```json
  {
    "phq9Score": 12,
    "gad7Score": 8,
    "item9Score": 0,
    "hasSelfHarmRisk": false
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "record": {
      "id": "scr_1726000000",
      "phq9Score": 12,
      "gad7Score": 8,
      "phq9Severity": "Sedang",
      "gad7Severity": "Ringan",
      "item9Score": 0,
      "hasSelfHarmRisk": false,
      "riskLevel": "Rendah",
      "status": "Menunggu Penanganan",
      "timestamp": "2026-09-14T10:00:00.000Z"
    }
  }
  ```

---

### 5.2 Ambil Riwayat Skrining
- **Method & Path**: `GET /screenings`
- **Deskripsi**: Mengambil daftar riwayat asesmen mandiri. Petugas/konselor yang mengakses data mahasiswa wajib memiliki izin *consent sharing* dari mahasiswa bersangkutan.
- **Auth Required**: Ya
- **Query Params**: `userId` (opsional untuk staf), `page`, `limit`
- **Success Response (200 OK)**:
  ```json
  [
    {
      "id": "scr_1726000000",
      "phq9Score": 12,
      "gad7Score": 8,
      "phq9Severity": "Sedang",
      "gad7Severity": "Ringan",
      "riskLevel": "Rendah",
      "timestamp": "2026-09-14T10:00:00.000Z"
    }
  ]
  ```

---

### 5.3 Update Status Penanganan Krisis Skrining
- **Method & Path**: `PUT /screenings/:id`
- **Deskripsi**: Memperbarui status tindak lanjut krisis oleh konselor atau administrator.
- **Auth Required**: Ya (`konselor`, `admin`)
- **Request Body**:
  ```json
  {
    "status": "Sedang Ditangani"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  { "success": true }
  ```

---

## 6. Emergency & SOS API (`/sos` & `/crisis-classifier`)

### 6.1 Pemicuan Darurat SOS (Emergency Trigger)
- **Method & Path**: `POST /sos/trigger`
- **Deskripsi**: Mengirimkan notifikasi darurat terenkripsi ke kontak darurat terverifikasi di server via SMS/WhatsApp Gateway. Jika dipanggil oleh *Guest* (tanpa login), sistem mengembalikan hotline resmi tanpa dispatch eksternal.
- **Auth Required**: Opsional
- **Request Body**:
  ```json
  {
    "location": {
      "latitude": -6.3627,
      "longitude": 106.8271,
      "accuracy": 15
    }
  }
  ```
- **Success Response (200 OK - Authenticated User)**:
  ```json
  {
    "success": true,
    "dispatchId": "sos_uuid_789",
    "status": "SENT",
    "timestamp": "2026-09-14T10:30:00.000Z",
    "recipientName": "I***u",
    "recipientPhone": "0812****001",
    "hasUserConsent": true,
    "message": "Sinyal SOS darurat terkirim via SMS/WhatsApp ke I***u (0812****001)."
  }
  ```
- **Possible Errors**:
  - `429 RATE_LIMIT_EXCEEDED`: Melebihi kuota 2x pengiriman per 15 menit.
  - `400 CONTACT_NOT_CONFIGURED`: Kontak darurat belum diatur pada akun.

---

### 6.2 Evaluasi & Klasifikasi Krisis AI
- **Method & Path**: `POST /crisis-classifier`
- **Deskripsi**: Menganalisis teks pesan untuk mendeteksi indikasi krisis bunuh diri, *self-harm*, atau keputusasaan berat menggunakan AI dengan *clinical rule fallback*.
- **Auth Required**: Opsional
- **Request Body**:
  ```json
  {
    "text": "Aku merasa hidupku tidak ada artinya lagi dan ingin menyerah."
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "severity": "CRITICAL",
    "isNegated": false,
    "reasoning": "Ekspresi keputusasaan berat dan niat mengakhiri hidup terdeteksi.",
    "recommendedAction": "SHOW_HOTLINE_AND_SOS"
  }
  ```

---

## 7. Counselors Directory & Analytics (`/counselors`)

### 7.1 Direktori Konselor Kampus
- **Method & Path**: `GET /counselors`
- **Deskripsi**: Mengambil daftar profil konselor dan psikolog terdaftar kampus beserta spesialisasi, rating, hari praktik, dan status lisensi resmi.
- **Auth Required**: Tidak (Publik)
- **Query Params**: `page`, `limit`, `format` (`array` atau `object`)
- **Success Response (200 OK)**:
  ```json
  [
    {
      "id": "c-1",
      "name": "Dr. Anita Rahmawati, M.Psi.",
      "title": "Konselor - Spesialis Burnout Akademik",
      "university": "Pusat Konseling UI",
      "specialties": ["Depresi Mahasiswa", "Anxiety Skripsi", "Burnout Akademik"],
      "rating": 4.9,
      "experienceYears": 11,
      "isFreeForStudents": true,
      "availableDays": ["Senin", "Rabu", "Jumat"],
      "isVerified": true,
      "licenseNumber": "SIPP-08912/HIMPSI/2026"
    }
  ]
  ```

---

### 7.2 Analitik Kesehatan Mental Kampus
- **Method & Path**: `GET /counselors/analytics`
- **Deskripsi**: Dasbor agregat statistik tren isu, skor rata-rata PHQ-9/GAD-7, dan faktor stresor mahasiswa.
- **Auth Required**: Ya (`konselor`, `admin`)
- **Success Response (200 OK)**:
  ```json
  {
    "totalSessionsThisMonth": 412,
    "activeStudentsThisWeek": 189,
    "highRiskCount": 14,
    "averagePhq9Score": 11.4,
    "averageGad7Score": 9.8,
    "stressorsBreakdown": [
      { "category": "Kendala Akademik & Skripsi", "percentage": 38, "count": 156 },
      { "category": "Kecemasan & Burnout", "percentage": 24, "count": 99 }
    ]
  }
  ```

---

### 7.3 Alert Mahasiswa Berisiko Tinggi
- **Method & Path**: `GET /counselors/risk-alerts`
- **Deskripsi**: Daftar peringatan kasus krisis berisiko tinggi untuk segera ditindaklanjuti oleh konselor bertugas.
- **Auth Required**: Ya (`konselor`, `admin`)

---

## 8. Privacy & User Data Protection API (`/privacy`)

Sesuai regulasi UU PDP (Pelindungan Data Pribadi) dan standar etika konseling:

### 8.1 Cek & Update Status Persetujuan (Granular Opt-In Consent)
- **Method & Path**: 
  - `GET /privacy/consent` (Cek status persetujuan)
  - `POST /privacy/consent` (Perbarui preferensi persetujuan)
- **Auth Required**: Ya
- **Request Body (POST)**:
  ```json
  {
    "consentForAI": true,
    "consentForAIMood": true,
    "consentForAIScreening": true,
    "consentForAIMemory": true,
    "consentForEmergencySOS": true,
    "consentForCounselorSharing": false,
    "retentionDays": 180
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "consent": {
      "userId": "usr_12345",
      "consentForAI": true,
      "consentForAIMemory": true,
      "consentForCounselorSharing": false,
      "retentionDays": 180
    }
  }
  ```

---

### 8.2 Cabut Seluruh Izin Data (Revoke All Consent)
- **Method & Path**: `POST /privacy/consent/revoke`
- **Deskripsi**: Mencabut semua persetujuan pemrosesan data sekaligus dan membersihkan memori AI aktif.
- **Auth Required**: Ya
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Seluruh izin persetujuan data berhasil dicabut dan memori AI dibersihkan."
  }
  ```

---

### 8.3 Download Salinan Data Lengkap (Data Portability / Export)
- **Method & Path**: `GET /privacy/download-data`
- **Deskripsi**: Mengunduh seluruh arsip data pribadi, riwayat chat, hasil skrining, dan log aktivitas dalam format file JSON.
- **Auth Required**: Ya
- **Response Headers**: `Content-Disposition: attachment; filename="ruangtenang_data_export_<userId>.json"`

---

### 8.4 Bersihkan Riwayat Aktivitas Saja (Tanpa Hapus Akun)
- **Method & Path**: `DELETE /privacy/activity`
- **Deskripsi**: Menghapus seluruh riwayat chat, rekaman mood, dan riwayat skrining mahasiswa namun mempertahankan akun.
- **Auth Required**: Ya
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Riwayat percakapan, catatan mood, dan skrining berhasil dibersihkan."
  }
  ```

---

### 8.5 Hak Penghapusan Permanen Akun (Right to be Forgotten)
- **Method & Path**: `POST /privacy/erasure-request`
- **Deskripsi**: Menghapus akun secara permanen beserta seluruh rekaman data identitas dari server secara *hard-delete*.
- **Auth Required**: Ya
- **Request Body**:
  ```json
  {
    "confirmText": "HAPUS AKUN SAYA",
    "confirmPassword": "PasswordSaatIni123!"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Permintaan penghapusan akun dan data pribadi Anda berhasil diproses."
  }
  ```

---

### 8.6 Audit Log Akses Petugas (Staff Access Transparency Logs)
- **Method & Path**: `GET /privacy/staff-access-logs`
- **Deskripsi**: Menampilkan riwayat kapan konselor atau staf membuka rekaman kesehatan mental mahasiswa demi transparansi.
- **Auth Required**: Ya

---

## 9. Health & System Observability API

### 9.1 Liveness Probe
- **Method & Path**: `GET /health` (atau `/api/v1/health`)
- **Deskripsi**: Endpoint pengecekan status hidup kontainer/layanan server.
- **Auth Required**: Tidak
- **Success Response (200 OK)**:
  ```json
  { "status": "healthy" }
  ```

---

### 9.2 Readiness Probe
- **Method & Path**: `GET /readiness` (atau `/api/v1/readiness`)
- **Deskripsi**: Pengecekan kesiapan database Prisma/PostgreSQL dan subsistem AI.
- **Auth Required**: Tidak (Detail disanitasi pada production)
- **Success Response (200 OK)**:
  ```json
  {
    "status": "ready",
    "services": {
      "database": "UP",
      "ai": "UP"
    }
  }
  ```

---

### 9.3 System & AI Metrics
- **Method & Path**: `GET /metrics` (atau `/api/v1/metrics`)
- **Deskripsi**: Menyajikan data metrik latensi, total percakapan, dan penggunaan token. Mendukung format JSON standar maupun format teks Prometheus (`Accept: text/plain`).
- **Auth Required**: Opsional
