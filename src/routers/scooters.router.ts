import { Router } from "express";
import { v4 as uuidv4 } from "uuid";

const router = Router();

interface Scooter {
  id: string;
  deactivated: boolean;
  inUse: boolean;
}

const scooters: Scooter[] = [];

router.post("/v1/register", (req, res) => {
  const uuid = uuidv4();
  scooters.push({ id: uuid, deactivated: false, inUse: false });
  res.json({ id: uuid });

  console.log("Scooter registrado com UUID:", uuid);
});

router.get("/v1/list", (_, res) => {
  res.json({ scooters: scooters.filter((scooter) => !scooter.deactivated) });
});

router.post("/v1/unlock/:id", (req, res) => {
  const { id } = req.params;

  const scooterIndex = scooters.findIndex((s) => s.id === id);
  const scooter = scooters[scooterIndex];

  if (!scooter) {
    res
      .status(404)
      .json({ message: `Scooter com UUID: ${id} não encontrado.` });

    return;
  }

  if (scooter.deactivated) {
    res
      .status(400)
      .json({ message: `Scooter com UUID: ${id} já está desativado.` });

    return;
  }

  if (scooter.inUse) {
    res
      .status(400)
      .json({ message: `Scooter com UUID: ${id} já está em uso.` });

    return;
  }

  res.json({ message: `Scooter com UUID: ${id} desbloqueado.` });

  console.log("Scooter desbloqueado com UUID:", id);
});

router.delete("/v1/deactivate/:id", (req, res) => {
  const { id } = req.params;

  const scooterIndex = scooters.findIndex((s) => s.id === id);

  if (scooterIndex !== -1) {
    if (!scooters[scooterIndex]) {
      return res
        .status(404)
        .json({ message: `Scooter com UUID: ${id} não encontrado.` });
    }

    scooters[scooterIndex].deactivated = true;

    res.json({ message: `Scooter com UUID: ${id} desativado.` });
  } else {
    res
      .status(404)
      .json({ message: `Scooter com UUID: ${id} não encontrado.` });
  }

  console.log("Scooter desativado com UUID:", id);
});

export default router;
