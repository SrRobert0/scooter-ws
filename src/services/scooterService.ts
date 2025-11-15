import { v4 as randomUUID } from "uuid";
import type {
  Scooter,
  ScooterCreateRequest,
  ScooterUpdateRequest,
} from "../types/scooter";

// Estado global dos patinetes
let scooters: Scooter[] = [];

// Constantes
const UNLOCK_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutos

/**
 * Obtém todos os patinetes
 */
export const getAllScooters = (): Scooter[] => {
  return scooters;
};

/**
 * Busca um patinete pelo ID
 */
export const findScooterById = (id: string): Scooter | undefined => {
  return scooters.find((scooter) => scooter.id === id);
};

/**
 * Busca o índice de um patinete pelo ID
 */
export const findScooterIndex = (id: string): number => {
  return scooters.findIndex((scooter) => scooter.id === id);
};

/**
 * Cria um novo patinete
 */
export const createScooter = (data: ScooterCreateRequest): Scooter => {
  const newScooter: Scooter = {
    id: randomUUID(),
    name: data.name,
    batteryLevel: data.batteryLevel,
    lat: data.lat,
    lon: data.lon,
    displacement: data.displacement,
    onUse: false,
    lastUpdate: new Date(),
  };

  scooters.push(newScooter);
  return newScooter;
};

/**
 * Atualiza um patinete existente
 */
export const updateScooter = (
  id: string,
  data: ScooterUpdateRequest
): Scooter | null => {
  const index = findScooterIndex(id);

  if (index === -1 || !scooters[index]) {
    return null;
  }

  const scooter = scooters[index];

  // Atualiza apenas os campos fornecidos
  if (data.name !== undefined) scooter.name = data.name;
  if (data.batteryLevel !== undefined) scooter.batteryLevel = data.batteryLevel;
  if (data.lat !== undefined) scooter.lat = data.lat;
  if (data.lon !== undefined) scooter.lon = data.lon;
  if (data.displacement !== undefined) scooter.displacement = data.displacement;
  if (data.onUse !== undefined) scooter.onUse = data.onUse;

  scooter.lastUpdate = new Date();

  return scooter;
};

/**
 * Inicia uma tentativa de desbloqueio
 */
export const startUnlockAttempt = (
  id: string,
  deviceId: string,
  onTimeout: (scooterId: string, deviceId: string) => void
): boolean => {
  const scooter = findScooterById(id);

  if (!scooter || scooter.onUse) {
    return false;
  }

  // Cancela timer anterior se existir
  if (scooter.unlockAttempt?.timerId) {
    clearTimeout(scooter.unlockAttempt.timerId);
  }

  // Configura nova tentativa
  const timerId = setTimeout(() => {
    onTimeout(id, deviceId);
  }, UNLOCK_TIMEOUT_MS);

  scooter.unlockAttempt = {
    deviceId,
    timestamp: new Date(),
    timerId,
  };

  scooter.onUse = true;

  return true;
};

/**
 * Confirma o desbloqueio (remove tentativa pendente)
 */
export const confirmUnlock = (id: string): boolean => {
  const scooter = findScooterById(id);

  if (!scooter) {
    return false;
  }

  // Cancela timer se existir
  if (scooter.unlockAttempt?.timerId) {
    clearTimeout(scooter.unlockAttempt.timerId);
    scooter.unlockAttempt = undefined;
  }

  return true;
};

/**
 * Processa desbloqueio automático por timeout
 */
export const processAutoUnlock = (
  scooterId: string,
  deviceId: string
): boolean => {
  const scooter = findScooterById(scooterId);

  if (
    !scooter ||
    !scooter.unlockAttempt ||
    scooter.unlockAttempt.deviceId !== deviceId
  ) {
    return false;
  }

  // Se ainda está em uso (aguardando desbloqueio), libera
  if (scooter.onUse) {
    scooter.unlockAttempt = undefined;
    scooter.onUse = false;
    scooter.lastUpdate = new Date();
    return true;
  }

  // Remove tentativa se já foi processada
  scooter.unlockAttempt = undefined;
  return false;
};

/**
 * Bloqueia um patinete
 */
export const lockScooter = (id: string): boolean => {
  const scooter = findScooterById(id);

  if (!scooter || !scooter.onUse) {
    return false;
  }

  // Cancela timer se existir
  if (scooter.unlockAttempt?.timerId) {
    clearTimeout(scooter.unlockAttempt.timerId);
    scooter.unlockAttempt = undefined;
  }

  scooter.onUse = false;
  scooter.lastUpdate = new Date();

  return true;
};

/**
 * Remove um patinete
 */
export const deleteScooter = (id: string): Scooter | null => {
  const index = findScooterIndex(id);

  if (index === -1 || !scooters[index]) {
    return null;
  }

  const scooter = scooters[index];

  // Cancela timer se existir
  if (scooter.unlockAttempt?.timerId) {
    clearTimeout(scooter.unlockAttempt.timerId);
  }

  scooters.splice(index, 1);
  return scooter;
};

/**
 * Obtém status de tentativa de desbloqueio
 */
export const getUnlockStatus = (id: string) => {
  const scooter = findScooterById(id);

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
};
