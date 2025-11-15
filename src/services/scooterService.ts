import type {
  Scooter,
  ScooterCreateRequest,
  ScooterUpdateRequest,
} from "../types/scooter";
import * as scooterRepository from "../repositories/scooterRepository";
import * as unlockAttemptRepository from "../repositories/unlockAttemptRepository";

// Constantes
const UNLOCK_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutos

// Map para gerenciar timers ativos (não persistidos no banco)
const activeTimers = new Map<string, NodeJS.Timeout>();

/**
 * Obtém todos os patinetes
 */
export const getAllScooters = async (): Promise<Scooter[]> => {
  return scooterRepository.findAllScooters();
};

/**
 * Busca um patinete pelo ID
 */
export const findScooterById = async (id: string): Promise<Scooter | null> => {
  return scooterRepository.findScooterById(id);
};

/**
 * Cria um novo patinete
 */
export const createScooter = async (
  data: ScooterCreateRequest
): Promise<Scooter> => {
  return scooterRepository.createScooter(data);
};

/**
 * Atualiza um patinete existente
 */
export const updateScooter = async (
  id: string,
  data: ScooterUpdateRequest
): Promise<Scooter | null> => {
  return scooterRepository.updateScooter(id, data);
};

/**
 * Inicia uma tentativa de desbloqueio
 */
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

    // Cria tentativa no banco de dados
    await unlockAttemptRepository.createUnlockAttempt(id, deviceId);

    // Atualiza patinete para "em uso"
    await scooterRepository.updateScooter(id, { onUse: true });

    // Configura novo timer
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

/**
 * Confirma o desbloqueio (remove tentativa pendente)
 */
export const confirmUnlock = async (id: string): Promise<boolean> => {
  try {
    // Cancela timer se existir
    const existingTimer = activeTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      activeTimers.delete(id);
    }

    // Desativa tentativa no banco
    await unlockAttemptRepository.deactivateUnlockAttemptsByScooterId(id);

    return true;
  } catch (error) {
    console.error("Erro ao confirmar desbloqueio:", error);
    return false;
  }
};

/**
 * Processa desbloqueio automático por timeout
 */
export const processAutoUnlock = async (
  scooterId: string,
  deviceId: string
): Promise<boolean> => {
  try {
    // Verifica se existe tentativa ativa para este patinete e device
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

    // Se ainda está em uso (aguardando desbloqueio), libera
    if (scooter.onUse) {
      // Desativa tentativa no banco
      await unlockAttemptRepository.deactivateUnlockAttemptsByScooterId(
        scooterId
      );

      // Atualiza patinete para "não em uso"
      await scooterRepository.updateScooter(scooterId, { onUse: false });

      return true;
    }

    return false;
  } catch (error) {
    console.error("Erro ao processar desbloqueio automático:", error);
    return false;
  }
};

/**
 * Bloqueia um patinete
 */
export const lockScooter = async (id: string): Promise<boolean> => {
  try {
    const scooter = await scooterRepository.findScooterById(id);

    if (!scooter || !scooter.onUse) {
      return false;
    }

    // Cancela timer se existir
    const existingTimer = activeTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      activeTimers.delete(id);
    }

    // Desativa tentativa no banco
    await unlockAttemptRepository.deactivateUnlockAttemptsByScooterId(id);

    // Atualiza patinete
    await scooterRepository.updateScooter(id, { onUse: false });

    return true;
  } catch (error) {
    console.error("Erro ao bloquear patinete:", error);
    return false;
  }
};

/**
 * Remove um patinete
 */
export const deleteScooter = async (id: string): Promise<Scooter | null> => {
  try {
    // Cancela timer se existir
    const existingTimer = activeTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      activeTimers.delete(id);
    }

    // Remove patinete (cascade remove tentativas)
    return scooterRepository.deleteScooter(id);
  } catch (error) {
    console.error("Erro ao deletar patinete:", error);
    return null;
  }
};

/**
 * Obtém status de tentativa de desbloqueio
 */
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
