import type { Request, Response } from "express";
import * as scooterService from "../services/scooterService.js";
import * as webSocketService from "../services/webSocketService.js";
import type {
  ScooterCreateRequest,
  ScooterUpdateRequest,
} from "../types/scooter";
import {
  validateScooterCreation,
  sanitizeScooterForJSON,
  calculateTimeRemaining,
} from "../utils/scooter.js";

/**
 * GET /status
 */
export const getStatus = (_req: Request, res: Response) => {
  res.send("Servidor está funcionando!");
};

/**
 * GET /scooters
 */
export const getAllScooters = (_req: Request, res: Response) => {
  const scooters = scooterService.getAllScooters();
  const sanitizedScooters = scooters.map(sanitizeScooterForJSON);
  res.json(sanitizedScooters);
};

/**
 * GET /scooters/:id
 */
export const getScooterById = (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "ID do patinete é obrigatório" });
  }

  const scooter = scooterService.findScooterById(id);

  if (!scooter) {
    return res.status(404).json({ error: "Patinete não encontrado" });
  }

  // Prepara resposta com informações de desbloqueio
  const response = {
    ...sanitizeScooterForJSON(scooter),
    unlockAttempt: scooter.unlockAttempt
      ? {
          deviceId: scooter.unlockAttempt.deviceId,
          timestamp: scooter.unlockAttempt.timestamp,
          timeRemaining: calculateTimeRemaining(
            scooter.unlockAttempt.timestamp
          ),
        }
      : undefined,
  };

  res.json(response);
};

/**
 * GET /scooters/:id/unlock-status
 */
export const getUnlockStatus = (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "ID do patinete é obrigatório" });
  }

  const status = scooterService.getUnlockStatus(id);

  if (status === null) {
    return res.status(404).json({ error: "Patinete não encontrado" });
  }

  res.json(status);
};

/**
 * POST /scooters/register
 */
export const createScooter = (req: Request, res: Response) => {
  const data: ScooterCreateRequest = req.body;

  // Validação
  const validation = validateScooterCreation(data);
  if (!validation.isValid) {
    return res.status(400).json({
      error: "Dados inválidos",
      errors: validation.errors,
    });
  }

  const newScooter = scooterService.createScooter(data);

  console.log("Novo patinete registrado:", newScooter.id);

  // Notifica clientes
  webSocketService.emitScooterEvent("creation");

  res.status(201).json(sanitizeScooterForJSON(newScooter));
};

/**
 * PUT /scooters/:id
 */
export const updateScooter = (req: Request, res: Response) => {
  const { id } = req.params;
  const data: ScooterUpdateRequest = req.body;

  if (!id) {
    return res.status(400).json({ error: "ID do patinete é obrigatório" });
  }

  console.log("Atualizando patinete:", id);

  const updatedScooter = scooterService.updateScooter(id, data);

  if (!updatedScooter) {
    console.log("Patinete não encontrado para atualização:", id);
    return res.status(404).json({ error: "Patinete não encontrado" });
  }

  // Notifica clientes
  webSocketService.emitScooterEvent("update", id);

  res.json(sanitizeScooterForJSON(updatedScooter));
};

/**
 * POST /scooters/:id/unlock/:deviceId
 */
export const unlockScooter = (req: Request, res: Response) => {
  const { id, deviceId } = req.params;

  if (!id || !deviceId) {
    return res.status(400).json({
      error: "ID do patinete e deviceId são obrigatórios",
    });
  }

  const scooter = scooterService.findScooterById(id);

  if (!scooter) {
    return res.status(404).json({ error: "Patinete não encontrado" });
  }

  if (scooter.onUse) {
    return res.status(400).json({ error: "Patinete já está em uso" });
  }

  // Callback para timeout de desbloqueio
  const handleTimeout = (scooterId: string, deviceId: string) => {
    const success = scooterService.processAutoUnlock(scooterId, deviceId);

    if (success) {
      console.log("Desbloqueio automático executado para patinete:", scooterId);

      // Notifica clientes
      webSocketService.emitScooterEvent("update", scooterId);
      webSocketService.emitScooterEvent("auto_unlock_timeout", undefined, {
        ...sanitizeScooterForJSON(scooterService.findScooterById(scooterId)!),
        message:
          "Patinete liberado automaticamente após 3 minutos - tentativa de desbloqueio expirou",
      });

      console.log(
        `Patinete foi liberado automaticamente após timeout de desbloqueio`
      );
    } else {
      console.log(
        "Tentativa de desbloqueio não encontrada ou já processada:",
        scooterId
      );
    }
  };

  const success = scooterService.startUnlockAttempt(
    id,
    deviceId,
    handleTimeout
  );

  if (!success) {
    return res.status(400).json({
      error: "Não foi possível iniciar o desbloqueio",
    });
  }

  console.log(
    "Iniciando processo de desbloqueio para patinete:",
    id,
    "- Timer de 3 minutos ativado"
  );

  // Notifica clientes
  const updatedScooter = scooterService.findScooterById(id)!;
  const unlockingData = {
    ...sanitizeScooterForJSON(updatedScooter),
    code: `${id} - ${deviceId}`,
  };

  webSocketService.emitScooterEvent("unlocking", id, unlockingData);
  webSocketService.emitScooterEvent("update");

  res.json({
    message: `Patinete ${scooter.name}: Iniciando processo de desbloqueio`,
    autoUnlockIn: "3 minutos",
  });
};

/**
 * POST /scooters/:id/ride
 */
export const startRide = (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "ID do patinete é obrigatório" });
  }

  const scooter = scooterService.findScooterById(id);

  if (!scooter) {
    return res.status(404).json({ error: "Patinete não encontrado" });
  }

  const success = scooterService.confirmUnlock(id);

  if (!success) {
    return res.status(400).json({
      error: "Não foi possível confirmar o desbloqueio",
    });
  }

  console.log("Iniciando passeio para patinete:", id);

  // Notifica clientes
  webSocketService.emitScooterEvent(
    "ride",
    id,
    sanitizeScooterForJSON(scooter)
  );

  res.json({
    message: `Patinete ${scooter.name}: Desbloqueado para uso`,
  });
};

/**
 * POST /scooters/:id/lock
 */
export const lockScooter = (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "ID do patinete é obrigatório" });
  }

  const scooter = scooterService.findScooterById(id);

  if (!scooter) {
    return res.status(404).json({ error: "Patinete não encontrado" });
  }

  if (!scooter.onUse) {
    return res.status(400).json({ error: "Patinete já está bloqueado" });
  }

  const success = scooterService.lockScooter(id);

  if (!success) {
    return res.status(400).json({
      error: "Não foi possível bloquear o patinete",
    });
  }

  console.log("Bloqueando patinete:", id);

  // Notifica clientes
  webSocketService.emitScooterEvent(
    "lock",
    undefined,
    sanitizeScooterForJSON(scooter)
  );

  res.json({
    message: `Patinete ${scooter.name}: Bloqueado com sucesso`,
  });
};

/**
 * DELETE /scooters/:id
 */
export const deleteScooter = (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "ID do patinete é obrigatório" });
  }

  const removedScooter = scooterService.deleteScooter(id);

  if (!removedScooter) {
    return res.status(404).json({ error: "Patinete não encontrado" });
  }

  console.log("Removendo patinete:", id);

  // Notifica clientes
  webSocketService.emitScooterEvent("delete");

  res.json({
    message: `Patinete ${removedScooter.name} removido com sucesso`,
  });
};
