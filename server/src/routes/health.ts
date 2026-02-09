/* ──────────────────────────────────────────────────────────
   LeadScout Server – /health route
   ────────────────────────────────────────────────────────── */

import { Router, Request, Response } from "express";
import { getAuthedClient } from "../services/oauth";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const auth = await getAuthedClient();
  res.json({
    status: "ok",
    google_auth: auth ? "connected" : "not_connected",
    timestamp: new Date().toISOString(),
  });
});

export default router;
