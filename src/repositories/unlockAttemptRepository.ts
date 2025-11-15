import { prisma } from "../lib/prisma";

export const createUnlockAttempt = async (
  scooterId: string,
  deviceId: string
) => {
  // Limpa as tentativas anteriores antes de criar uma nova
  await deactivateUnlockAttemptsByScooterId(scooterId);

  return prisma.unlockAttempt.create({
    data: {
      scooterId,
      deviceId,
      isActive: true,
    },
  });
};

export const findActiveUnlockAttemptByScooterId = async (scooterId: string) => {
  return prisma.unlockAttempt.findFirst({
    where: {
      scooterId,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

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

export const deactivateUnlockAttemptById = async (id: string) => {
  return prisma.unlockAttempt.update({
    where: { id },
    data: {
      isActive: false,
    },
  });
};

export const deleteUnlockAttemptsByScooterId = async (scooterId: string) => {
  return prisma.unlockAttempt.deleteMany({
    where: { scooterId },
  });
};
