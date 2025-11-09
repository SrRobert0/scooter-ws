import {Router} from 'express';

const router = Router();

router.get("/v1", (req, res) => {
    res.send("Listagem de rotas");
});

export default router;
