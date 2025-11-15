import { prisma } from "../lib/prisma";

const mapPrismaToScooter = (prismaScooter: any): Scooter => {
  const activeUnlockAttempt = prismaScooter.unlockAttempts?.[0];

  return {
    id: prismaScooter.id,
    name: prismaScooter.name,
    batteryLevel: prismaScooter.batteryLevel,
    lat: prismaScooter.lat,
    lon: prismaScooter.lon,
    displacement: prismaScooter.displacement,
    onUse: prismaScooter.onUse,
    lastUpdate: prismaScooter.updatedAt,
    unlockAttempt: activeUnlockAttempt
      ? {
          deviceId: activeUnlockAttempt.deviceId,
          timestamp: activeUnlockAttempt.timestamp,
        }
      : undefined,
  };
};

export const findAllScooters = async (): Promise<Scooter[]> => {
  const scooters = await prisma.scooter.findMany({
    include: {
      unlockAttempts: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return scooters.map(mapPrismaToScooter);
};

export const findScooterById = async (id: string): Promise<Scooter | null> => {
  const scooter = await prisma.scooter.findUnique({
    where: { id },
    include: {
      unlockAttempts: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return scooter ? mapPrismaToScooter(scooter) : null;
};

export const createScooter = async (
  data: ScooterCreateRequest
): Promise<Scooter> => {
  const scooter = await prisma.scooter.create({
    data: {
      name: data.name,
      batteryLevel: data.batteryLevel,
      lat: data.lat,
      lon: data.lon,
      displacement: data.displacement,
      onUse: false,
    },
    include: {
      unlockAttempts: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return mapPrismaToScooter(scooter);
};

export const updateScooter = async (
  id: string,
  data: ScooterUpdateRequest
): Promise<Scooter | null> => {
  try {
    const scooter = await prisma.scooter.update({
      where: { id },
      data: {
        ...data,
      },
      include: {
        unlockAttempts: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return mapPrismaToScooter(scooter);
  } catch {
    return null;
  }
};

export const deleteScooter = async (id: string): Promise<Scooter | null> => {
  try {
    const scooter = await prisma.scooter.delete({
      where: { id },
      include: {
        unlockAttempts: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return mapPrismaToScooter(scooter);
  } catch {
    return null;
  }
};
