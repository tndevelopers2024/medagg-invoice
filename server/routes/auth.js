import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { getDb } from "../mongo.js";
import { requireJwtUser } from "../middleware/requireJwtUser.js";

export const authRouter = Router();

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const signToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");

  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isWebsiteHead: user.role === "website_head",
    permissions: user.permissions || [],
  };

  return jwt.sign(payload, secret, { expiresIn });
};

const toUserResponse = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  isWebsiteHead: user.role === "website_head",
  permissions: user.permissions || [],
  status: user.status,
});

authRouter.post("/signup", async (req, res) => {
  const db = getDb();
  const { email, password, fullName, department } = req.body ?? {};

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const existing = await db.collection("users").findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);

  const doc = {
    email: normalizedEmail,
    passwordHash,
    name: fullName || normalizedEmail.split("@")[0],
    department: department || "",
    status: "pending",
    role: "user",
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection("users").insertOne(doc);

  const created = await db.collection("users").findOne({ _id: result.insertedId });

  return res.status(201).json({ user: toUserResponse({ ...created, id: created._id.toString() }) });
});

authRouter.post("/login", async (req, res) => {
  const db = getDb();
  const { email, password } = req.body ?? {};

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const userDoc = await db.collection("users").findOne({ email: normalizedEmail });
  if (!userDoc) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const ok = await bcrypt.compare(String(password), String(userDoc.passwordHash || ""));
  if (!ok) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  if (userDoc.status === "pending") {
    return res.status(403).json({ error: "Account pending approval" });
  }

  if (userDoc.status === "inactive") {
    return res.status(403).json({ error: "Account inactive" });
  }

  const user = {
    id: userDoc._id.toString(),
    email: userDoc.email,
    name: userDoc.name,
    role: userDoc.role || "user",
    permissions: userDoc.permissions || [],
    status: userDoc.status || "active",
  };

  const token = signToken(user);

  return res.json({ token, user: toUserResponse(user) });
});

authRouter.get("/me", requireJwtUser, async (req, res) => {
  // req.user is already the signed payload
  return res.json({ user: req.user });
});
