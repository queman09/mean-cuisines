import { db } from "./db";
import { contributors, recipes, scheduleSlots } from "@shared/schema";
import type { Contributor, InsertContributor, Recipe, InsertRecipe, ScheduleSlot, InsertScheduleSlot } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Contributors
  getContributors(): Contributor[];
  getContributor(id: number): Contributor | undefined;
  createContributor(data: InsertContributor): Contributor;

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
}

export const storage = new DatabaseStorage();
