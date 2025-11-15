import type { Router } from "express";
import * as scooterController from "../controllers/scooterController";

export const setupScooterRoutes = (router: Router): void => {
  router.get("/status", scooterController.getStatus);

  router.get("/scooters", scooterController.getAllScooters);
  router.get("/scooters/:id", scooterController.getScooterById);
  router.post("/scooters/register", scooterController.createScooter);
  router.put("/scooters/:id", scooterController.updateScooter);
  router.delete("/scooters/:id", scooterController.deleteScooter);

  router.get("/scooters/:id/unlock-status", scooterController.getUnlockStatus);
  router.post(
    "/scooters/:id/unlock/:deviceId",
    scooterController.unlockScooter
  );
  router.post("/scooters/:id/ride", scooterController.startRide);
  router.post("/scooters/:id/lock", scooterController.lockScooter);
};
