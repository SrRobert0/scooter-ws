import type { Scooter } from "../types/scooter";
import { prisma } from "../lib/prisma";
import type {
  ScooterCreateRequest,
  ScooterUpdateRequest,
} from "../types/scooter";

/**
 * Mapeia objeto Prisma para tipo Scooter
 */
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
          // timerId será adicionado pelo Service quando necessário
        }
      : undefined,
  };
};

/**
 * Busca todos os patinetes
 */
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

/**
 * Busca patinete por ID
 */
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

/**
 * Cria um novo patinete
 */
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

/**
 * Atualiza um patinete
 */
export const updateScooter = async (
  id: string,
  data: ScooterUpdateRequest
): Promise<Scooter | null> => {
  try {
    const scooter = await prisma.scooter.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.batteryLevel !== undefined && {
          batteryLevel: data.batteryLevel,
        }),
        ...(data.lat !== undefined && { lat: data.lat }),
        ...(data.lon !== undefined && { lon: data.lon }),
        ...(data.displacement !== undefined && {
          displacement: data.displacement,
        }),
        ...(data.onUse !== undefined && { onUse: data.onUse }),
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

/**
 * Remove um patinete
 */
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
