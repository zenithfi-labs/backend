import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db } from "./db";
import { waitlist } from "./db/schema";
import { eq } from "drizzle-orm";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Basic health check
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Zenith API is operational" });
});

// Join Waitlist API
app.post("/api/waitlist", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        // Check if email already exists
        const existing = await db.select().from(waitlist).where(eq(waitlist.email, email)).limit(1);

        if (existing.length > 0) {
            return res.status(400).json({ error: "Email already on waitlist" });
        }

        // Insert into database
        await db.insert(waitlist).values({ email });

        res.status(201).json({ success: true, message: "Added to waitlist" });
    } catch (error: any) {
        console.error("Waitlist error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
