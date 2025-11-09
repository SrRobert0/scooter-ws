import {Router} from 'express';

const router = Router();

router.get("/v1", (req, res) => {
    res.send("Listagem de logs");
});

export default router;
