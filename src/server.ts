import app from "./app";
import ENV from "./config/env";

try {
    app.listen(ENV.PORT, () => {
        console.log(`Servidor rodando na porta ${ENV.PORT}`);
    });
} catch (error) {
    console.error("Erro crítico ao iniciar o servidor: ", error);
    process.exit(1);
}