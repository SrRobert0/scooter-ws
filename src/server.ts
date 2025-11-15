import app from "./app";
import ENV from "./config/env";
import { connectDatabase, disconnectDatabase } from "./lib/prisma";

const startServer = async () => {
  try {
    // Conecta ao banco de dados
    await connectDatabase();
    
    // Inicia o servidor
    app.listen(ENV.PORT, () => {
      console.log(`Servidor rodando na porta ${ENV.PORT}`);
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🔄 Encerrando servidor...');
      await disconnectDatabase();
      process.exit(0);
    });
    
  } catch (error) {
    console.error("Erro crítico ao iniciar o servidor: ", error);
    process.exit(1);
  }
};

startServer();
