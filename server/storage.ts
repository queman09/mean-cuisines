import { db } from "./db";
import { contributors, recipes, scheduleSlots, suggestions, visits } from "@shared/schema";
import type { Contributor, InsertContributor, Recipe, InsertRecipe, ScheduleSlot, InsertScheduleSlot, Suggestion, InsertSuggestion, Visit, InsertVisit } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  // Contributors
  getContributors(): Contributor[];
  getContributor(id: number): Contributor | undefined;
  createContributor(data: InsertContributor): Contributor;
  deleteContributor(id: number): boolean;

  // Recipes
  getRecipes(): Recipe[];
  getRecipe(id: number): Recipe | undefined;
  createRecipe(data: InsertRecipe): Recipe;
  updateRecipe(id: number, data: Partial<InsertRecipe>): Recipe | undefined;
  deleteRecipe(id: number): boolean;

  // Schedule slots
  getScheduleSlots(): ScheduleSlot[];
  createScheduleSlot(data: InsertScheduleSlot): ScheduleSlot;
  deleteAllScheduleSlots(): void;
  replaceScheduleSlots(slots: InsertScheduleSlot[]): ScheduleSlot[];

  // Suggestions
  createSuggestion(data: InsertSuggestion): Suggestion;
  getSuggestions(status?: string): Suggestion[];
  updateSuggestionStatus(id: number, status: string): Suggestion | undefined;

  // Visits (hashed IP only)
  recordVisit(data: InsertVisit): Visit;
  getVisitorStats(day: string): { uniqueVisitors: number; hits: number };
}

export class DatabaseStorage implements IStorage {
  getContributors(): Contributor[] {
    return db.select().from(contributors).all();
  }

  getContributor(id: number): Contributor | undefined {
    return db.select().from(contributors).where(eq(contributors.id, id)).get();
  }

  createContributor(data: InsertContributor): Contributor {
    return db.insert(contributors).values(data).returning().get();
  }

  deleteContributor(id: number): boolean {
    const result = db.delete(contributors).where(eq(contributors.id, id)).run();
    return result.changes > 0;
  }

  getRecipes(): Recipe[] {
    return db.select().from(recipes).all();
  }

  getRecipe(id: number): Recipe | undefined {
    return db.select().from(recipes).where(eq(recipes.id, id)).get();
  }

  createRecipe(data: InsertRecipe): Recipe {
    return db.insert(recipes).values(data).returning().get();
  }

  updateRecipe(id: number, data: Partial<InsertRecipe>): Recipe | undefined {
    return db.update(recipes).set(data).where(eq(recipes.id, id)).returning().get();
  }

  deleteRecipe(id: number): boolean {
    const result = db.delete(recipes).where(eq(recipes.id, id)).run();
    return result.changes > 0;
  }

  getScheduleSlots(): ScheduleSlot[] {
    return db.select().from(scheduleSlots).all();
  }

  createScheduleSlot(data: InsertScheduleSlot): ScheduleSlot {
    return db.insert(scheduleSlots).values(data).returning().get();
  }

  deleteAllScheduleSlots(): void {
    db.delete(scheduleSlots).run();
  }

  replaceScheduleSlots(slots: InsertScheduleSlot[]): ScheduleSlot[] {
    db.delete(scheduleSlots).run();
    if (slots.length === 0) return [];
    return db.insert(scheduleSlots).values(slots).returning().all();
  }

  createSuggestion(data: InsertSuggestion): Suggestion {
    return db.insert(suggestions).values(data).returning().get();
  }

  getSuggestions(status?: string): Suggestion[] {
    if (status) {
      return db.select().from(suggestions).where(eq(suggestions.status, status)).all();
    }
    return db.select().from(suggestions).all();
  }

  updateSuggestionStatus(id: number, status: string): Suggestion | undefined {
    return db
      .update(suggestions)
      .set({ status, reviewedAt: new Date().toISOString() })
      .where(eq(suggestions.id, id))
      .returning()
      .get();
  }

  recordVisit(data: InsertVisit): Visit {
    return db.insert(visits).values(data).returning().get();
  }

  getVisitorStats(day: string): { uniqueVisitors: number; hits: number } {
    const row = db
      .select({
        hits: sql<number>`count(*)`,
        uniqueVisitors: sql<number>`count(distinct ${visits.ipHash})`,
      })
      .from(visits)
      .where(eq(visits.day, day))
      .get();
    return {
      hits: Number(row?.hits ?? 0),
      uniqueVisitors: Number(row?.uniqueVisitors ?? 0),
    };
  }
}

export const storage = new DatabaseStorage();
