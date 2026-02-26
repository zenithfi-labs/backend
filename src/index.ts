import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dns from "dns";
import { promisify } from "util";
import { db } from "./db";
import { waitlist } from "./db/schema";
import { eq } from "drizzle-orm";

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

const resolveMx = promisify(dns.resolveMx);

// Root health check (Often used by Railway/AWS for base uptime monitoring)
app.get("/", (req, res) => {
    res.json({ status: "ok", service: "Zenith Finance API", version: "1.0" });
});

// Detailed API health check
app.get("/api/v1/health", (req, res) => {
    res.json({ status: "ok", message: "Zenith API is operational" });
});

// Join Waitlist API
app.post("/api/v1/waitlist", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        // 1. Basic Syntax Validation (Regex)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        // 2. Prevent Disposable/Fake Domains (Optional hardcoded list, but DNS is better)
        const domain = email.split("@")[1];

        // 3. DNS MX Record Check (Ensure the domain can actually receive emails)
        try {
            const mxRecords = await resolveMx(domain);
            if (!mxRecords || mxRecords.length === 0) {
                return res.status(400).json({ error: "Email domain is invalid or cannot receive emails" });
            }
        } catch (dnsError) {
            console.warn(`DNS check failed for domain ${domain}:`, dnsError);
            return res.status(400).json({ error: "Invalid email domain (fake/unreachable)" });
        }

        // 4. Check if email already exists in DB
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
    console.log(`[INFO] Server listening on port ${PORT}`);
});
