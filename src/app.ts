import app from './lib/express';
import scootersRouter from './routers/scooters.router';
import logsRouter from './routers/logs.router';
import routesRouter from './routers/routes.router';

app.get("/status", (_, res) => {
    res.send("Servidor está funcionando!");
});

app.use("/scooters", scootersRouter);

export default app;