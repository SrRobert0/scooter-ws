export const sanitizeScooterForJSON = (
  scooter: Scooter,
  onlyScooter: boolean = true
) => {
  // onlyScooter = true -> Retorna apenas os dados do patinete
  return {
    ...scooter,
    ...(onlyScooter
      ? undefined
      : {
          unlockAttempt: scooter.unlockAttempt
            ? {
                deviceId: scooter.unlockAttempt.deviceId,
                timestamp: scooter.unlockAttempt.timestamp,
                timeRemaining: calculateTimeRemaining(
                  scooter.unlockAttempt.timestamp
                ),
              }
            : undefined,
        }),
  };
};

export const calculateTimeRemaining = (
  timestamp: Date,
  timeoutMs: number = 180000
): number => {
  return Math.max(0, timeoutMs - (Date.now() - timestamp.getTime())) / 1000;
};

export const validateScooterCreation = (
  data: any
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== "string") {
    errors.push("Nome do patinete é obrigatório e deve ser um texto");
  }

  if (
    data.batteryLevel === undefined ||
    typeof data.batteryLevel !== "number" ||
    data.batteryLevel < 0 ||
    data.batteryLevel > 100
  ) {
    errors.push("Nível de bateria é obrigatório e deve estar entre 0 e 100");
  }

  if (data.lat === undefined || typeof data.lat !== "number") {
    errors.push("Latitude é obrigatória e deve ser um número");
  }

  if (data.lon === undefined || typeof data.lon !== "number") {
    errors.push("Longitude é obrigatória e deve ser um número");
  }

  if (
    data.displacement === undefined ||
    typeof data.displacement !== "number"
  ) {
    errors.push("Deslocamento é obrigatório e deve ser um número");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
