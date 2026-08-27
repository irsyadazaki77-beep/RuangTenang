import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const counselors = [
  {
    id: "cs-01",
    name: "Dr. Aisyah Putri, M.Psi, Psikolog",
    role: "Psikolog Klinis",
    specialties: JSON.stringify(["Kecemasan", "Depresi", "Manajemen Stres"]),
    imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200",
    availability: JSON.stringify(["Senin, 09:00 - 12:00", "Rabu, 13:00 - 16:00"]),
    rating: 4.9,
    sessionCount: 342,
    university: "Universitas Indonesia"
  },
  {
    id: "cs-02",
    name: "Budi Santoso, M.Psi, Psikolog",
    role: "Psikolog Pendidikan",
    specialties: JSON.stringify(["Motivasi Belajar", "Krisis Identitas", "Trauma"]),
    imageUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200",
    availability: JSON.stringify(["Selasa, 10:00 - 14:00", "Kamis, 09:00 - 12:00"]),
    rating: 4.8,
    sessionCount: 215,
    university: "Universitas Indonesia"
  },
  {
    id: "cs-03",
    name: "Dr. Maya Wulandari",
    role: "Psikiater",
    specialties: JSON.stringify(["Gangguan Kecemasan Berat", "Bipolar", "Insomnia"]),
    imageUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200",
    availability: JSON.stringify(["Jumat, 15:00 - 18:00"]),
    rating: 5.0,
    sessionCount: 156,
    university: "Universitas Indonesia"
  }
];

async function seed() {
  for (const c of counselors) {
    await prisma.counselors.upsert({
      where: { id: c.id },
      update: c,
      create: c
    });
  }
  console.log('Seeded counselors');
}
seed().catch(console.error).finally(() => prisma.$disconnect());
