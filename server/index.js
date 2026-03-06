import express from "express";
import cors from "cors";
import { config as loadEnv } from "dotenv";
import bcrypt from "bcryptjs";

import { connectMongo } from "./mongo.js";
import { requireJwtUser } from "./middleware/requireJwtUser.js";
import { hospitalsRouter } from "./routes/hospitals.js";
import { patientsRouter } from "./routes/patients.js";
import { invoicesRouter } from "./routes/invoices.js";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { getDb } from "./mongo.js";

loadEnv({ path: new URL("../.env", import.meta.url) });

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Public auth routes
app.use("/api/auth", authRouter);

// All other API routes require a valid JWT
app.use("/api", requireJwtUser);

app.use("/api/hospitals", hospitalsRouter);
app.use("/api/patients", patientsRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/admin", adminRouter);

const port = Number(process.env.PORT || process.env.API_PORT || 3001);

try {
  // eslint-disable-next-line no-console
  console.log(
    `Startup env: MONGO_URI=${process.env.MONGO_URI ? "set" : "missing"}, MONGO_DB_NAME=${process.env.MONGO_DB_NAME ? "set" : "missing"}, JWT_SECRET=${process.env.JWT_SECRET ? "set" : "missing"}`,
  );
  await connectMongo();
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("Failed to start: Mongo connection error", err);
  process.exit(1);
}

const seedAdminIfNeeded = async () => {
  const email = String(process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.SEED_ADMIN_PASSWORD || "");
  const name = String(process.env.SEED_ADMIN_NAME || "Website Head");
  if (!email || !password) return;

  const db = getDb();
  const existingHead = await db.collection("users").findOne({ role: "website_head" });
  if (existingHead) return;

  const existing = await db.collection("users").findOne({ email });
  if (existing) {
    await db.collection("users").updateOne(
      { _id: existing._id },
      {
        $set: {
          role: "website_head",
          status: "active",
          permissions: existing.permissions && existing.permissions.length ? existing.permissions : ["*"],
          updatedAt: new Date(),
        },
      },
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.collection("users").insertOne({
    email,
    passwordHash,
    name,
    department: "",
    status: "active",
    role: "website_head",
    permissions: ["*"],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

try {
  await seedAdminIfNeeded();
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("Failed to start: admin seed error", err);
  process.exit(1);
}

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});
