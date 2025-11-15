interface UnlockAttempt {
  deviceId: string;
  timestamp: Date;
  timerId?: NodeJS.Timeout;
}

interface Scooter {
  id: string;
  name: string;
  batteryLevel: number;
  lat: number;
  lon: number;
  displacement: number;
  onUse: boolean;
  lastUpdate?: Date;
  unlockAttempt?: UnlockAttempt | undefined;
}

interface ScooterCreateRequest {
  name: string;
  batteryLevel: number;
  lat: number;
  lon: number;
  displacement: number;
}

interface ScooterUpdateRequest {
  name?: string;
  batteryLevel?: number;
  lat?: number;
  lon?: number;
  displacement?: number;
  onUse?: boolean;
}

interface ScooterResponse extends Omit<Scooter, "unlockAttempt"> {
  unlockAttempt?: {
    deviceId: string;
    timestamp: Date;
    timeRemaining: number;
  };
}

interface UnlockStatusResponse {
  hasUnlockAttempt: boolean;
  message?: string;
  deviceId?: string;
  startTime?: Date;
  timeElapsedMs?: number;
  timeRemainingMs?: number;
  timeRemainingSeconds?: number;
  willAutoUnlockAt?: Date;
}
