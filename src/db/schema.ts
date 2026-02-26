import { serial, text, timestamp, pgTable } from "drizzle-orm/pg-core";

export const waitlist = pgTable("waitlist", {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    status: text("status").default("pending"), // e.g., pending, approved, notified
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
