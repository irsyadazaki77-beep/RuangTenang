import { prisma } from "../database";
import { CounselorRecord } from "../database";

export const counselorRepository = {
  async getCounselors(limit = 100, offset = 0): Promise<CounselorRecord[]> {
    const list = await prisma.counselors.findMany({
      orderBy: { name: "asc" },
      take: limit,
      skip: offset,
    });

    return list.map((c) => ({
      ...c,
      specialties: JSON.parse(c.specialties),
      availability: JSON.parse(c.availability),
      rating: c.rating ?? undefined,
      sessionCount: c.sessionCount ?? undefined,
      university: c.university || undefined,
      licenseNumber: c.licenseNumber || undefined,
      experienceYears: c.experienceYears ?? undefined,
      isFreeForStudents: c.isFreeForStudents,
      price: c.price ?? undefined,
      consultationType: c.consultationType ? JSON.parse(c.consultationType) : undefined,
      contactPhone: c.contactPhone || undefined,
      contactWhatsapp: c.contactWhatsapp || undefined,
      languages: c.languages ? JSON.parse(c.languages) : undefined,
      bio: c.bio || undefined,
      location: c.location || undefined,
      userId: c.userId || undefined,
      createdAt: c.createdAt.toISOString(),
    }));
  },

  async getCounselorById(id: string): Promise<CounselorRecord | null> {
    const c = await prisma.counselors.findUnique({
      where: { id },
    });
    if (!c) return null;

    return {
      ...c,
      specialties: JSON.parse(c.specialties),
      availability: JSON.parse(c.availability),
      rating: c.rating ?? undefined,
      sessionCount: c.sessionCount ?? undefined,
      university: c.university || undefined,
      licenseNumber: c.licenseNumber || undefined,
      experienceYears: c.experienceYears ?? undefined,
      isFreeForStudents: c.isFreeForStudents,
      price: c.price ?? undefined,
      consultationType: c.consultationType ? JSON.parse(c.consultationType) : undefined,
      contactPhone: c.contactPhone || undefined,
      contactWhatsapp: c.contactWhatsapp || undefined,
      languages: c.languages ? JSON.parse(c.languages) : undefined,
      bio: c.bio || undefined,
      location: c.location || undefined,
      userId: c.userId || undefined,
      createdAt: c.createdAt.toISOString(),
    };
  },

  async addCounselor(
    counselor: Omit<CounselorRecord, "id" | "createdAt">,
  ): Promise<CounselorRecord> {
    const id = "cns-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const timestamp = new Date();

    const created = await prisma.counselors.create({
      data: {
        id,
        name: counselor.name,
        role: counselor.role,
        specialties: JSON.stringify(counselor.specialties),
        imageUrl: counselor.imageUrl,
        availability: JSON.stringify(counselor.availability),
        rating: counselor.rating ?? 5.0,
        sessionCount: counselor.sessionCount ?? 0,
        university: counselor.university || null,
        licenseNumber: counselor.licenseNumber || null,
        isVerified: counselor.isVerified ?? false,
        experienceYears: counselor.experienceYears ?? 5,
        isFreeForStudents: counselor.isFreeForStudents ?? true,
        price: counselor.price ?? 0,
        consultationType: counselor.consultationType
          ? JSON.stringify(counselor.consultationType)
          : null,
        contactPhone: counselor.contactPhone || null,
        contactWhatsapp: counselor.contactWhatsapp || null,
        languages: counselor.languages
          ? JSON.stringify(counselor.languages)
          : null,
        bio: counselor.bio || null,
        location: counselor.location || null,
        isDemoData: counselor.isDemoData ?? false,
        userId: counselor.userId || null,
        createdAt: timestamp,
      },
    });

    return {
      ...created,
      specialties: JSON.parse(created.specialties),
      availability: JSON.parse(created.availability),
      rating: created.rating ?? undefined,
      sessionCount: created.sessionCount ?? undefined,
      university: created.university || undefined,
      licenseNumber: created.licenseNumber || undefined,
      experienceYears: created.experienceYears ?? undefined,
      isFreeForStudents: created.isFreeForStudents,
      price: created.price ?? undefined,
      consultationType: created.consultationType ? JSON.parse(created.consultationType) : undefined,
      contactPhone: created.contactPhone || undefined,
      contactWhatsapp: created.contactWhatsapp || undefined,
      languages: created.languages ? JSON.parse(created.languages) : undefined,
      bio: created.bio || undefined,
      location: created.location || undefined,
      userId: created.userId || undefined,
      createdAt: created.createdAt.toISOString(),
    };
  },
};
