import app from "./app";
import ENV from "./config/env";
import { connectDatabase, disconnectDatabase } from "./lib/prisma";

const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(ENV.PORT, () => {
      console.log(`Servidor rodando na porta ${ENV.PORT}`);
    });

    process.on("SIGINT", async () => {
      console.log("\nEncerrando servidor...");
      await disconnectDatabase();

      process.exit(0);
    });
  } catch (error) {
    console.error("Erro crítico ao iniciar o servidor: ", error);
    process.exit(1);
  }
};

startServer();
