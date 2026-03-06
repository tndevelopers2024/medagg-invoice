import { Router } from "express";

export const paymentsRouter = Router();

// Payments are embedded inside invoices. This is a placeholder route.
paymentsRouter.get("/", async (_req, res) => {
  res.json([]);
});
