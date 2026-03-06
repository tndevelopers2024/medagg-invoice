import { Router } from "express";
import { ObjectId } from "mongodb";

import { getDb } from "../mongo.js";
import { toPublic } from "../utils/toPublic.js";

export const patientsRouter = Router();

patientsRouter.get("/", async (_req, res) => {
  const db = getDb();
  const patients = await db.collection("patients").find({}).sort({ patientDate: -1, createdAt: -1 }).toArray();
  res.json(patients.map(toPublic));
});

patientsRouter.post("/", async (req, res) => {
  const db = getDb();
  const payload = req.body ?? {};

  if (!payload?.name || !payload?.hospitalId) {
    return res.status(400).json({ error: "name and hospitalId are required" });
  }

  const now = new Date();

  const doc = {
    ...payload,
    createdBy: req.user.id,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection("patients").insertOne(doc);
  const created = await db.collection("patients").findOne({ _id: result.insertedId });
  res.status(201).json(toPublic(created));
});

patientsRouter.put("/:id", async (req, res) => {
  const db = getDb();

  let _id;
  try {
    _id = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ error: "Invalid id" });
  }

  const payload = req.body ?? {};

  const result = await db.collection("patients").findOneAndUpdate(
    { _id },
    { $set: { ...payload, updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!result.value) return res.status(404).json({ error: "Not found" });
  res.json(toPublic(result.value));
});

patientsRouter.delete("/:id", async (req, res) => {
  const db = getDb();

  let _id;
  try {
    _id = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ error: "Invalid id" });
  }

  const result = await db.collection("patients").deleteOne({ _id });
  if (result.deletedCount === 0) return res.status(404).json({ error: "Not found" });

  res.status(204).send();
});
