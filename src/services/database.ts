import { PrismaClient } from '../generated/prisma';

// Singleton do Prisma Client
let prisma: PrismaClient | null = null;

/**
 * Obtém instância do Prisma Client
 */
export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  return prisma;
};

/**
 * Conecta ao banco de dados
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    const client = getPrismaClient();
    await client.$connect();
    console.log('✅ Conectado ao banco de dados com sucesso');
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    throw error;
  }
};

/**
 * Desconecta do banco de dados
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    if (prisma) {
      await prisma.$disconnect();
      prisma = null;
      console.log('✅ Desconectado do banco de dados');
    }
  } catch (error) {
    console.error('❌ Erro ao desconectar do banco de dados:', error);
    throw error;
  }
};

// Exporta a instância do cliente para uso direto
export const db = getPrismaClient();
