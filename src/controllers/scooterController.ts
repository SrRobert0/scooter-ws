import type { Request, Response } from "express";
import * as scooterService from "../services/scooterService.js";
import * as webSocketService from "../services/webSocketService.js";
import {
  validateScooterCreation,
  sanitizeScooterForJSON,
} from "../utils/scooter.js";

export const getStatus = (_req: Request, res: Response) => {
  res.send("Servidor está funcionando!");
};

export const getAllScooters = async (_req: Request, res: Response) => {
  try {
    const scooters = await scooterService.getAllScooters();
    const sanitizedScooters = scooters.map((scooter) =>
      sanitizeScooterForJSON(scooter)
    );

    res.json(sanitizedScooters);
  } catch (error) {
    console.error("Erro ao buscar patinetes:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

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

    const response = sanitizeScooterForJSON(scooter, false);

    res.json(response);
  } catch (error) {
    console.error("Erro ao buscar patinete:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

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

export const createScooter = async (req: Request, res: Response) => {
  try {
    const data: ScooterCreateRequest = req.body;

    const validation = validateScooterCreation(data);
    if (!validation.isValid) {
      return res.status(400).json({
        error: "Dados inválidos",
        errors: validation.errors,
      });
    }

    const newScooter = await scooterService.createScooter(data);

    console.log("Novo patinete registrado:", newScooter.id);

    webSocketService.emitClientEvent(
      "creation",
      undefined,
      sanitizeScooterForJSON(newScooter)
    );

    res.status(201).json(sanitizeScooterForJSON(newScooter));
  } catch (error) {
    console.error("Erro ao criar patinete:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

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

    webSocketService.emitClientEvent(
      "update",
      undefined,
      sanitizeScooterForJSON(updatedScooter)
    );

    res.json(sanitizeScooterForJSON(updatedScooter));
  } catch (error) {
    console.error("Erro ao atualizar patinete:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

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

        const updatedScooter = await scooterService.findScooterById(scooterId);
        if (updatedScooter) {
          webSocketService.emitScooterEvent(
            "scooter_lock",
            sanitizeScooterForJSON(updatedScooter)
          );

          webSocketService.emitClientEvent(
            "update",
            updatedScooter.id,
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

    const updatedScooter = await scooterService.findScooterById(id);
    if (!updatedScooter) {
      return res.status(404).json({ error: "Patinete não encontrado" });
    }

    const unlockingData = {
      ...sanitizeScooterForJSON(updatedScooter),
      code: `${id} - ${deviceId}`,
    };

    webSocketService.emitScooterEvent("scooter_unlocking", unlockingData);
    webSocketService.emitClientEvent("update", id, unlockingData);

    res.json({
      message: `Patinete ${scooter.name}: Iniciando processo de desbloqueio`,
      autoUnlockIn: "3 minutos",
    });
  } catch (error) {
    console.error("Erro ao desbloquear patinete:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

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

    webSocketService.emitClientEvent(
      "ride",
      scooter.id,
      sanitizeScooterForJSON(scooter)
    );
    webSocketService.emitScooterEvent(
      "scooter_ride",
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

    webSocketService.emitClientEvent(
      "lock",
      scooter.id,
      sanitizeScooterForJSON(scooter)
    );
    webSocketService.emitScooterEvent(
      "scooter_lock",
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
    webSocketService.emitClientEvent("delete", undefined, removedScooter);

    res.json({
      message: `Patinete ${removedScooter.name} removido com sucesso`,
    });
  } catch (error) {
    console.error("Erro ao deletar patinete:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};
