import { Router } from "express";
import { ObjectId } from "mongodb";

import { getDb } from "../mongo.js";
import { toPublic } from "../utils/toPublic.js";

export const invoicesRouter = Router();

invoicesRouter.get("/", async (_req, res) => {
  const db = getDb();
  const invoices = await db.collection("invoices").find({}).sort({ invoiceDate: -1, createdAt: -1 }).toArray();
  res.json(invoices.map(toPublic));
});

invoicesRouter.get("/:id", async (req, res) => {
  const db = getDb();

  let _id;
  try {
    _id = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ error: "Invalid id" });
  }

  const invoice = await db.collection("invoices").findOne({ _id });
  if (!invoice) return res.status(404).json({ error: "Not found" });
  res.json(toPublic(invoice));
});

invoicesRouter.post("/", async (req, res) => {
  const db = getDb();
  const payload = req.body ?? {};

  if (!payload?.invoiceNumber || !payload?.hospitalId) {
    return res.status(400).json({ error: "invoiceNumber and hospitalId are required" });
  }

  const now = new Date();

  const doc = {
    ...payload,
    payments: payload.payments || [],
    items: payload.items || [],
    createdBy: req.user.id,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection("invoices").insertOne(doc);
  const created = await db.collection("invoices").findOne({ _id: result.insertedId });
  res.status(201).json(toPublic(created));
});

invoicesRouter.put("/:id", async (req, res) => {
  const db = getDb();

  let _id;
  try {
    _id = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ error: "Invalid id" });
  }

  const payload = req.body ?? {};

  const result = await db.collection("invoices").findOneAndUpdate(
    { _id },
    { $set: { ...payload, updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!result.value) return res.status(404).json({ error: "Not found" });
  res.json(toPublic(result.value));
});

invoicesRouter.delete("/:id", async (req, res) => {
  const db = getDb();

  let _id;
  try {
    _id = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ error: "Invalid id" });
  }

  const result = await db.collection("invoices").deleteOne({ _id });
  if (result.deletedCount === 0) return res.status(404).json({ error: "Not found" });

  res.status(204).send();
});

invoicesRouter.post("/:id/payments", async (req, res) => {
  const db = getDb();

  let _id;
  try {
    _id = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ error: "Invalid id" });
  }

  const payment = req.body ?? {};
  if (!payment?.paymentDate) {
    return res.status(400).json({ error: "paymentDate is required" });
  }

  const invoice = await db.collection("invoices").findOne({ _id });
  if (!invoice) return res.status(404).json({ error: "Not found" });

  const payments = Array.isArray(invoice.payments) ? [...invoice.payments] : [];

  const id = payment.id || new ObjectId().toString();
  const nextPayment = { ...payment, id, invoiceId: toPublic(invoice).id };

  const existingIdx = payments.findIndex((p) => p.id === id);
  if (existingIdx >= 0) payments[existingIdx] = nextPayment;
  else payments.push(nextPayment);

  const result = await db.collection("invoices").findOneAndUpdate(
    { _id },
    { $set: { payments, updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  res.json(toPublic(result.value));
});
