import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log("Conectado ao banco de dados PostgreSQL");
  } catch (error) {
    console.error("Erro ao conectar ao banco de dados:", error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    console.log("Desconectado do banco de dados");
  } catch (error) {
    console.error("Erro ao desconectar do banco de dados:", error);
  }
};
