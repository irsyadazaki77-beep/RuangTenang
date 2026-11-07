// ==========================================
// OPENAPI 3.0 SPECIFICATION
// ==========================================
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'RuangTenang Kampus Mental Health API',
    version: '1.0.0',
    description: 'API v1 produksi untuk platform kesehatan mental & konseling mahasiswa Indonesia dengan AI, screening PHQ-9/GAD-7, dan pemicu SOS darurat.',
    contact: {
      name: 'Tim Pengembang RuangTenang Kampus',
      email: 'support@ruangtenang.ac.id'
    }
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API Production Endpoint v1'
    }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Pemeriksaan Kesehatan Database & AI System',
        description: 'Memeriksa konektivitas database persistent, status AI Gemini, uptime, serta statistik sistem.',
        responses: {
          '200': {
            description: 'Sistem Sehat',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    timestamp: { type: 'string', example: '2026-08-04T04:46:00.000Z' },
                    services: {
                      type: 'object',
                      properties: {
                        database: { type: 'string', example: 'UP' },
                        ai: { type: 'string', example: 'UP' }
                      }
                    },
                    uptimeSeconds: { type: 'number', example: 1245.5 },
                    requestId: { type: 'string', example: 'd8a7c2e1-4b3f-4e92-b8d1-7c2a3f8b9e10' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/auth/register': {
      post: {
        summary: 'Registrasi Akun Baru (Mahasiswa / Konselor / Admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'role'],
                properties: {
                  name: { type: 'string', example: 'Ahmad Mahasiswa' },
                  email: { type: 'string', example: 'ahmad@ui.ac.id' },
                  password: { type: 'string', example: 'sandi123' },
                  role: { type: 'string', enum: ['mahasiswa', 'konselor', 'admin'], example: 'mahasiswa' },
                  university: { type: 'string', example: 'Universitas Indonesia' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Registrasi Berhasil' },
          '400': { description: 'Email Sudah Terdaftar / Validasi Gagal' }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Masuk Sesi Pengguna',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'ahmad@ui.ac.id' },
                  password: { type: 'string', example: 'sandi123' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Login Berhasil' },
          '401': { description: 'Kredensial Tidak Valid' }
        }
      }
    },
    '/db/appointments': {
      get: {
        summary: 'Dapatkan Daftar Janji Temu Konseling (Dengan Pagination)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'string', default: '10' } },
          { name: 'status', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Daftar Janji Temu Terformat DTO' }
        }
      },
      post: {
        summary: 'Buat Janji Temu Konseling Baru (Mendukung X-Idempotency-Key)',
        parameters: [
          { name: 'X-Idempotency-Key', in: 'header', schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['counselorName', 'date', 'time'],
                properties: {
                  counselorId: { type: 'string', example: 'cons-1' },
                  counselorName: { type: 'string', example: 'Dr. Anita Rahmawati, M.Psi.' },
                  date: { type: 'string', example: '2026-08-10' },
                  time: { type: 'string', example: '10:30' },
                  timezone: { type: 'string', enum: ['WIB', 'WITA', 'WIT'], example: 'WIB' },
                  mode: { type: 'string', example: 'Online Video Call' },
                  notes: { type: 'string', example: 'Kecemasan ujian' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Janji Temu Berhasil Dibuat' },
          '409': { description: 'Konflik Jadwal Slot Penuh' }
        }
      }
    },
    '/sos/trigger': {
      post: {
        summary: 'Pemicu Protokol Darurat SOS Kampus (Mendukung X-Idempotency-Key)',
        parameters: [
          { name: 'X-Idempotency-Key', in: 'header', schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['emergencyContact', 'hasUserConsent'],
                properties: {
                  emergencyContact: {
                    type: 'object',
                    required: ['name', 'phone'],
                    properties: {
                      name: { type: 'string', example: 'Bapak Kandung' },
                      phone: { type: 'string', example: '081234567890' }
                    }
                  },
                  hasUserConsent: { type: 'boolean', example: true }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Sinyal SOS Darurat Berhasil Ditransmisikan' }
        }
      }
    }
  }
};
