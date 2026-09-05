import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Contributors who add recipes
export const contributors = sqliteTable("contributors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  photoUrl: text("photo_url").notNull(),
  role: text("role").notNull().default("contributor"), // "admin" | "contributor"
});

export const insertContributorSchema = createInsertSchema(contributors).omit({ id: true });
export type InsertContributor = z.infer<typeof insertContributorSchema>;
export type Contributor = typeof contributors.$inferSelect;

// Equipment enum
export type Equipment = "oven" | "stove" | "airFryer" | "counter" | "instantPot" | "microwave";

// Recipes table
export const recipes = sqliteTable("recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  cookTimeMinutes: integer("cook_time_minutes").notNull(),
  servings: integer("servings").notNull().default(1),
  // Equipment as JSON array of Equipment strings
  equipment: text("equipment").notNull().default("[]"),
  // Ingredients as JSON array of {name, qty, unit}
  ingredients: text("ingredients").notNull().default("[]"),
  // Steps as JSON array of strings
  steps: text("steps").notNull().default("[]"),
  // Tags
  tags: text("tags").notNull().default("[]"),
  // Image URL (user-submitted link or generated)
  imageUrl: text("image_url"),
  // Attribution
  contributorId: integer("contributor_id").references(() => contributors.id),
  // External link (optional, if added from a URL)
  sourceUrl: text("source_url"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({ id: true, createdAt: true });
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;

// Schedule slots
export const scheduleSlots = sqliteTable("schedule_slots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id").references(() => recipes.id).notNull(),
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(),
  equipment: text("equipment").notNull(), // which equipment this slot uses
});

export const insertScheduleSlotSchema = createInsertSchema(scheduleSlots).omit({ id: true });
export type InsertScheduleSlot = z.infer<typeof insertScheduleSlotSchema>;
export type ScheduleSlot = typeof scheduleSlots.$inferSelect;

// Suggestion inbox (humans + agents; pending operator approval)
export const suggestions = sqliteTable("suggestions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  suggestion: text("suggestion").notNull(),
  why: text("why").default(""),
  contact: text("contact"),
  source: text("source").notNull().default("human"), // "human" | "agent"
  agentName: text("agent_name"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected | parked
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  reviewedAt: text("reviewed_at"),
});

export const insertSuggestionSchema = createInsertSchema(suggestions)
  .omit({ id: true, createdAt: true, reviewedAt: true })
  .extend({
    status: z.enum(["pending", "approved", "rejected", "parked"]).optional().default("pending"),
  });
export type InsertSuggestion = z.infer<typeof insertSuggestionSchema>;
export type Suggestion = typeof suggestions.$inferSelect;

// Unique-visitor beacon (hashed IP only — never store raw IP)
export const visits = sqliteTable("visits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  day: text("day").notNull(), // YYYY-MM-DD (UTC)
  ipHash: text("ip_hash").notNull(),
  path: text("path").notNull().default("/"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertVisitSchema = createInsertSchema(visits).omit({ id: true, createdAt: true });
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visits.$inferSelect;
