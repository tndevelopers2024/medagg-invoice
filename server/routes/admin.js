import { Router } from "express";
import { ObjectId } from "mongodb";

import { getDb } from "../mongo.js";
import { requireWebsiteHead } from "../middleware/requireWebsiteHead.js";

export const adminRouter = Router();

adminRouter.use(requireWebsiteHead);

const toUser = (doc) => {
  if (!doc) return doc;
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    department: doc.department || "",
    status: doc.status || "pending",
    role: doc.role || "user",
    permissions: doc.permissions || [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

adminRouter.get("/users", async (_req, res) => {
  const db = getDb();
  const users = await db.collection("users").find({}).sort({ createdAt: -1 }).toArray();
  res.json(users.map(toUser));
});

adminRouter.patch("/users/:id", async (req, res) => {
  const db = getDb();

  let _id;
  try {
    _id = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ error: "Invalid id" });
  }

  const payload = req.body ?? {};

  const allowed = {};
  if (payload.status) allowed.status = payload.status;
  if (payload.role) allowed.role = payload.role;
  if (payload.name !== undefined) allowed.name = payload.name;
  if (payload.department !== undefined) allowed.department = payload.department;
  if (payload.permissions !== undefined) allowed.permissions = payload.permissions;

  const result = await db.collection("users").findOneAndUpdate(
    { _id },
    { $set: { ...allowed, updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!result.value) return res.status(404).json({ error: "Not found" });
  res.json(toUser(result.value));
});

adminRouter.delete("/users/:id", async (req, res) => {
  const db = getDb();

  let _id;
  try {
    _id = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ error: "Invalid id" });
  }

  const result = await db.collection("users").deleteOne({ _id });
  if (result.deletedCount === 0) return res.status(404).json({ error: "Not found" });

  res.status(204).send();
});
