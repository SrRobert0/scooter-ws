import type { Scooter } from '../types/scooter';
import { prisma } from '../lib/prisma';
import type { ScooterCreateRequest, ScooterUpdateRequest } from '../types/scooter';

/**
 * Repository para operações de banco de dados relacionadas a patinetes
 */
export class ScooterRepository {
  
  /**
   * Busca todos os patinetes
   */
  async findAll(): Promise<Scooter[]> {
    const scooters = await prisma.scooter.findMany({
      include: {
        unlockAttempts: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return scooters.map(this.mapPrismaToScooter);
  }

  /**
   * Busca patinete por ID
   */
  async findById(id: string): Promise<Scooter | null> {
    const scooter = await prisma.scooter.findUnique({
      where: { id },
      include: {
        unlockAttempts: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    return scooter ? this.mapPrismaToScooter(scooter) : null;
  }

  /**
   * Cria um novo patinete
   */
  async create(data: ScooterCreateRequest): Promise<Scooter> {
    const scooter = await prisma.scooter.create({
      data: {
        name: data.name,
        batteryLevel: data.batteryLevel,
        lat: data.lat,
        lon: data.lon,
        displacement: data.displacement,
        onUse: false
      },
      include: {
        unlockAttempts: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    return this.mapPrismaToScooter(scooter);
  }

  /**
   * Atualiza um patinete
   */
  async update(id: string, data: ScooterUpdateRequest): Promise<Scooter | null> {
    try {
      const scooter = await prisma.scooter.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.batteryLevel !== undefined && { batteryLevel: data.batteryLevel }),
          ...(data.lat !== undefined && { lat: data.lat }),
          ...(data.lon !== undefined && { lon: data.lon }),
          ...(data.displacement !== undefined && { displacement: data.displacement }),
          ...(data.onUse !== undefined && { onUse: data.onUse }),
        },
        include: {
          unlockAttempts: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      return this.mapPrismaToScooter(scooter);
    } catch {
      return null;
    }
  }

  /**
   * Remove um patinete
   */
  async delete(id: string): Promise<Scooter | null> {
    try {
      const scooter = await prisma.scooter.delete({
        where: { id },
        include: {
          unlockAttempts: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      return this.mapPrismaToScooter(scooter);
    } catch {
      return null;
    }
  }

  /**
   * Mapeia objeto Prisma para tipo Scooter
   */
  private mapPrismaToScooter(prismaScooter: any): Scooter {
    const activeUnlockAttempt = prismaScooter.unlockAttempts?.[0];
    
    return {
      id: prismaScooter.id,
      name: prismaScooter.name,
      batteryLevel: prismaScooter.batteryLevel,
      lat: prismaScooter.lat,
      lon: prismaScooter.lon,
      displacement: prismaScooter.displacement,
      onUse: prismaScooter.onUse,
      lastUpdate: prismaScooter.updatedAt,
      unlockAttempt: activeUnlockAttempt ? {
        deviceId: activeUnlockAttempt.deviceId,
        timestamp: activeUnlockAttempt.timestamp,
        // timerId será adicionado pelo Service quando necessário
      } : undefined
    };
  }
}

export const scooterRepository = new ScooterRepository();
