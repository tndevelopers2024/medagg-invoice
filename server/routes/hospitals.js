import { Router } from "express";
import { ObjectId } from "mongodb";

import { getDb } from "../mongo.js";
import { toPublic } from "../utils/toPublic.js";

export const hospitalsRouter = Router();

hospitalsRouter.get("/", async (req, res) => {
  const db = getDb();

  // Default behavior: show all hospitals.
  // If you want per-user isolation, change this to { createdBy: req.user.id }
  const hospitals = await db
    .collection("hospitals")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  res.json(hospitals.map(toPublic));
});

hospitalsRouter.get("/:id", async (req, res) => {
  const db = getDb();

  let _id;
  try {
    _id = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ error: "Invalid id" });
  }

  const hospital = await db.collection("hospitals").findOne({ _id });
  if (!hospital) return res.status(404).json({ error: "Not found" });

  res.json(toPublic(hospital));
});

hospitalsRouter.post("/", async (req, res) => {
  const db = getDb();

  const payload = req.body ?? {};
  if (!payload?.name) {
    return res.status(400).json({ error: "name is required" });
  }

  const now = new Date();
  const doc = {
    ...payload,
    createdBy: req.user.id,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection("hospitals").insertOne(doc);

  const created = await db.collection("hospitals").findOne({ _id: result.insertedId });
  res.status(201).json(toPublic(created));
});

hospitalsRouter.put("/:id", async (req, res) => {
  const db = getDb();

  let _id;
  try {
    _id = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ error: "Invalid id" });
  }

  const payload = req.body ?? {};

  const result = await db.collection("hospitals").findOneAndUpdate(
    { _id },
    { $set: { ...payload, updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!result.value) {
    return res.status(404).json({ error: "Not found" });
  }

  res.json(toPublic(result.value));
});

hospitalsRouter.delete("/:id", async (req, res) => {
  const db = getDb();

  let _id;
  try {
    _id = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ error: "Invalid id" });
  }

  const result = await db.collection("hospitals").deleteOne({ _id });

  if (result.deletedCount === 0) {
    return res.status(404).json({ error: "Not found" });
  }

  res.status(204).send();
});
