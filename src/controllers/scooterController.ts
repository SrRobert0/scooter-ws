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
import { connectDatabase } from "../lib/prisma.js";

/**
 * GET /status
 */
export const getStatus = (_req: Request, res: Response) => {
  res.send("Servidor está funcionando!");
};

/**
 * GET /scooters
 */
export const getAllScooters = async (_req: Request, res: Response) => {
  try {
    const scooters = await scooterService.getAllScooters();
    const sanitizedScooters = scooters.map(sanitizeScooterForJSON);
    res.json(sanitizedScooters);
  } catch (error) {
    console.error("Erro ao buscar patinetes:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

/**
 * GET /scooters/:id
 */
export const getScooterById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "ID do patinete é obrigatório" });
    }

    const scooter = await scooterService.findScooterById(id);

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
  } catch (error) {
    console.error("Erro ao buscar patinete:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

/**
 * GET /scooters/:id/unlock-status
 */
export const getUnlockStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "ID do patinete é obrigatório" });
    }

    const status = await scooterService.getUnlockStatus(id);

    if (status === null) {
      return res.status(404).json({ error: "Patinete não encontrado" });
    }

    res.json(status);
  } catch (error) {
    console.error("Erro ao obter status de desbloqueio:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

/**
 * POST /scooters/register
 */
export const createScooter = async (req: Request, res: Response) => {
  try {
    const data: ScooterCreateRequest = req.body;

    // Validação
    const validation = validateScooterCreation(data);
    if (!validation.isValid) {
      return res.status(400).json({
        error: "Dados inválidos",
        errors: validation.errors,
      });
    }

    const newScooter = await scooterService.createScooter(data);

    console.log("Novo patinete registrado:", newScooter.id);

    // Notifica clientes
    webSocketService.emitScooterEvent("creation");

    res.status(201).json(sanitizeScooterForJSON(newScooter));
  } catch (error) {
    console.error("Erro ao criar patinete:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

/**
 * PUT /scooters/:id
 */
export const updateScooter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: ScooterUpdateRequest = req.body;

    if (!id) {
      return res.status(400).json({ error: "ID do patinete é obrigatório" });
    }

    console.log("Atualizando patinete:", id);

    const updatedScooter = await scooterService.updateScooter(id, data);

    if (!updatedScooter) {
      console.log("Patinete não encontrado para atualização:", id);
      return res.status(404).json({ error: "Patinete não encontrado" });
    }

    // Notifica clientes
    webSocketService.emitScooterEvent("update", id);

    res.json(sanitizeScooterForJSON(updatedScooter));
  } catch (error) {
    console.error("Erro ao atualizar patinete:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

/**
 * POST /scooters/:id/unlock/:deviceId
 */
export const unlockScooter = async (req: Request, res: Response) => {
  try {
    const { id, deviceId } = req.params;

    if (!id || !deviceId) {
      return res.status(400).json({
        error: "ID do patinete e deviceId são obrigatórios",
      });
    }

    const scooter = await scooterService.findScooterById(id);

    if (!scooter) {
      return res.status(404).json({ error: "Patinete não encontrado" });
    }

    if (scooter.onUse) {
      return res.status(400).json({ error: "Patinete já está em uso" });
    }

    // Callback para timeout de desbloqueio
    const handleTimeout = async (scooterId: string, deviceId: string) => {
      const success = await scooterService.processAutoUnlock(
        scooterId,
        deviceId
      );

      if (success) {
        console.log(
          "Desbloqueio automático executado para patinete:",
          scooterId
        );

        // Notifica clientes com evento de lock
        const updatedScooter = await scooterService.findScooterById(scooterId);
        if (updatedScooter) {
          webSocketService.emitScooterEvent(
            "lock",
            undefined,
            sanitizeScooterForJSON(updatedScooter)
          );
        }

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

    const success = await scooterService.startUnlockAttempt(
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

    // Busca o patinete atualizado
    const updatedScooter = await scooterService.findScooterById(id);
    if (!updatedScooter) {
      return res.status(404).json({ error: "Patinete não encontrado" });
    }

    // Notifica clientes
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
  } catch (error) {
    console.error("Erro ao desbloquear patinete:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

/**
 * POST /scooters/:id/ride
 */
export const startRide = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "ID do patinete é obrigatório" });
    }

    const scooter = await scooterService.findScooterById(id);

    if (!scooter) {
      return res.status(404).json({ error: "Patinete não encontrado" });
    }

    const success = await scooterService.confirmUnlock(id);

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
  } catch (error) {
    console.error("Erro ao iniciar passeio:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

/**
 * POST /scooters/:id/lock
 */
export const lockScooter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "ID do patinete é obrigatório" });
    }

    const scooter = await scooterService.findScooterById(id);

    if (!scooter) {
      return res.status(404).json({ error: "Patinete não encontrado" });
    }

    if (!scooter.onUse) {
      return res.status(400).json({ error: "Patinete já está bloqueado" });
    }

    const success = await scooterService.lockScooter(id);

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
  } catch (error) {
    console.error("Erro ao bloquear patinete:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

/**
 * DELETE /scooters/:id
 */
export const deleteScooter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "ID do patinete é obrigatório" });
    }

    const removedScooter = await scooterService.deleteScooter(id);

    if (!removedScooter) {
      return res.status(404).json({ error: "Patinete não encontrado" });
    }

    console.log("Removendo patinete:", id);

    // Notifica clientes
    webSocketService.emitScooterEvent("delete");

    res.json({
      message: `Patinete ${removedScooter.name} removido com sucesso`,
    });
  } catch (error) {
    console.error("Erro ao deletar patinete:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};
