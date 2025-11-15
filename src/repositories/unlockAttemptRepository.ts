import { prisma } from "../lib/prisma";

/**
 * Cria uma nova tentativa de desbloqueio
 */
export const createUnlockAttempt = async (
  scooterId: string,
  deviceId: string
) => {
  // Primeiro, desativa tentativas anteriores para este patinete
  await deactivateUnlockAttemptsByScooterId(scooterId);

  // Cria nova tentativa
  return prisma.unlockAttempt.create({
    data: {
      scooterId,
      deviceId,
      isActive: true,
    },
  });
};

/**
 * Busca tentativa ativa por ID do patinete
 */
export const findActiveUnlockAttemptByScooterId = async (scooterId: string) => {
  return prisma.unlockAttempt.findFirst({
    where: {
      scooterId,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Busca tentativa ativa por ID do patinete e device
 */
export const findActiveUnlockAttemptByScooterAndDevice = async (
  scooterId: string,
  deviceId: string
) => {
  return prisma.unlockAttempt.findFirst({
    where: {
      scooterId,
      deviceId,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Desativa tentativa de desbloqueio
 */
export const deactivateUnlockAttemptsByScooterId = async (
  scooterId: string
) => {
  return prisma.unlockAttempt.updateMany({
    where: {
      scooterId,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });
};

/**
 * Desativa tentativa específica
 */
export const deactivateUnlockAttemptById = async (id: string) => {
  return prisma.unlockAttempt.update({
    where: { id },
    data: {
      isActive: false,
    },
  });
};

/**
 * Remove todas as tentativas de um patinete
 */
export const deleteUnlockAttemptsByScooterId = async (scooterId: string) => {
  return prisma.unlockAttempt.deleteMany({
    where: { scooterId },
  });
};
