import { prisma } from '../lib/prisma';

/**
 * Repository para operações de banco de dados relacionadas a tentativas de desbloqueio
 */
export class UnlockAttemptRepository {
  
  /**
   * Cria uma nova tentativa de desbloqueio
   */
  async create(scooterId: string, deviceId: string) {
    // Primeiro, desativa tentativas anteriores para este patinete
    await this.deactivateByScooterId(scooterId);

    // Cria nova tentativa
    return prisma.unlockAttempt.create({
      data: {
        scooterId,
        deviceId,
        isActive: true
      }
    });
  }

  /**
   * Busca tentativa ativa por ID do patinete
   */
  async findActiveByScooterId(scooterId: string) {
    return prisma.unlockAttempt.findFirst({
      where: {
        scooterId,
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Busca tentativa ativa por ID do patinete e device
   */
  async findActiveByScooterAndDevice(scooterId: string, deviceId: string) {
    return prisma.unlockAttempt.findFirst({
      where: {
        scooterId,
        deviceId,
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Desativa tentativa de desbloqueio
   */
  async deactivateByScooterId(scooterId: string) {
    return prisma.unlockAttempt.updateMany({
      where: {
        scooterId,
        isActive: true
      },
      data: {
        isActive: false
      }
    });
  }

  /**
   * Desativa tentativa específica
   */
  async deactivateById(id: string) {
    return prisma.unlockAttempt.update({
      where: { id },
      data: {
        isActive: false
      }
    });
  }

  /**
   * Remove todas as tentativas de um patinete
   */
  async deleteByScooterId(scooterId: string) {
    return prisma.unlockAttempt.deleteMany({
      where: { scooterId }
    });
  }
}

export const unlockAttemptRepository = new UnlockAttemptRepository();
