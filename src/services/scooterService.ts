import * as scooterRepository from "../repositories/scooterRepository";
import * as unlockAttemptRepository from "../repositories/unlockAttemptRepository";
import { UNLOCK_TIMEOUT_MS } from "../utils/contants";

// Map para gerenciar timers ativos (não persistidos no banco)
const activeTimers = new Map<string, NodeJS.Timeout>();

export const getAllScooters = async (): Promise<Scooter[]> => {
  return scooterRepository.findAllScooters();
};

export const findScooterById = async (id: string): Promise<Scooter | null> => {
  return scooterRepository.findScooterById(id);
};

export const createScooter = async (
  data: ScooterCreateRequest
): Promise<Scooter> => {
  return scooterRepository.createScooter(data);
};

export const updateScooter = async (
  id: string,
  data: ScooterUpdateRequest
): Promise<Scooter | null> => {
  return scooterRepository.updateScooter(id, data);
};

export const startUnlockAttempt = async (
  id: string,
  deviceId: string,
  onTimeout: (scooterId: string, deviceId: string) => void
): Promise<boolean> => {
  try {
    const scooter = await scooterRepository.findScooterById(id);

    if (!scooter || scooter.onUse) {
      return false;
    }

    // Cancela timer anterior se existir
    const existingTimer = activeTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      activeTimers.delete(id);
    }

    await unlockAttemptRepository.createUnlockAttempt(id, deviceId);

    await scooterRepository.updateScooter(id, { onUse: true });

    const timerId = setTimeout(async () => {
      await onTimeout(id, deviceId);
      activeTimers.delete(id);
    }, UNLOCK_TIMEOUT_MS);

    activeTimers.set(id, timerId);

    return true;
  } catch (error) {
    console.error("Erro ao iniciar tentativa de desbloqueio:", error);
    return false;
  }
};

export const confirmUnlock = async (id: string): Promise<boolean> => {
  try {
    const existingTimer = activeTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      activeTimers.delete(id);
    }

    await unlockAttemptRepository.deactivateUnlockAttemptsByScooterId(id);

    return true;
  } catch (error) {
    console.error("Erro ao confirmar desbloqueio:", error);
    return false;
  }
};

export const processAutoUnlock = async (
  scooterId: string,
  deviceId: string
): Promise<boolean> => {
  try {
    const unlockAttempt =
      await unlockAttemptRepository.findActiveUnlockAttemptByScooterAndDevice(
        scooterId,
        deviceId
      );

    if (!unlockAttempt) {
      return false;
    }

    const scooter = await scooterRepository.findScooterById(scooterId);

    if (!scooter) {
      return false;
    }

    if (scooter.onUse) {
      await unlockAttemptRepository.deactivateUnlockAttemptsByScooterId(
        scooterId
      );

      await scooterRepository.updateScooter(scooterId, { onUse: false });

      return true;
    }

    return false;
  } catch (error) {
    console.error("Erro ao processar desbloqueio automático:", error);
    return false;
  }
};

export const lockScooter = async (id: string): Promise<boolean> => {
  try {
    const scooter = await scooterRepository.findScooterById(id);

    if (!scooter || !scooter.onUse) {
      return false;
    }

    const existingTimer = activeTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      activeTimers.delete(id);
    }

    await unlockAttemptRepository.deactivateUnlockAttemptsByScooterId(id);

    await scooterRepository.updateScooter(id, { onUse: false });

    return true;
  } catch (error) {
    console.error("Erro ao bloquear patinete:", error);
    return false;
  }
};

export const deleteScooter = async (id: string): Promise<Scooter | null> => {
  try {
    const existingTimer = activeTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      activeTimers.delete(id);
    }

    return scooterRepository.deleteScooter(id);
  } catch (error) {
    console.error("Erro ao deletar patinete:", error);
    return null;
  }
};

export const getUnlockStatus = async (id: string) => {
  try {
    const scooter = await scooterRepository.findScooterById(id);

    if (!scooter) {
      return null;
    }

    if (!scooter.unlockAttempt) {
      return {
        hasUnlockAttempt: false,
        message: "Nenhuma tentativa de desbloqueio em andamento",
      };
    }

    const timeElapsed = Date.now() - scooter.unlockAttempt.timestamp.getTime();
    const timeRemaining = Math.max(0, UNLOCK_TIMEOUT_MS - timeElapsed);

    return {
      hasUnlockAttempt: true,
      deviceId: scooter.unlockAttempt.deviceId,
      startTime: scooter.unlockAttempt.timestamp,
      timeElapsedMs: timeElapsed,
      timeRemainingMs: timeRemaining,
      timeRemainingSeconds: Math.ceil(timeRemaining / 1000),
      willAutoUnlockAt: new Date(
        scooter.unlockAttempt.timestamp.getTime() + UNLOCK_TIMEOUT_MS
      ),
    };
  } catch (error) {
    console.error("Erro ao obter status de desbloqueio:", error);
    return null;
  }
};
