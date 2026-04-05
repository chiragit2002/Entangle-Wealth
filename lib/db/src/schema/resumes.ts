import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const resumesTable = pgTable("resumes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").default("My Résumé"),
  template: text("template").default("professional"),
  summary: text("summary"),
  skills: jsonb("skills").$type<string[]>().default([]),
  certifications: jsonb("certifications").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const resumeExperiencesTable = pgTable("resume_experiences", {
  id: serial("id").primaryKey(),
  resumeId: integer("resume_id").notNull().references(() => resumesTable.id, { onDelete: "cascade" }),
  company: text("company").notNull(),
  title: text("title").notNull(),
  location: text("location"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  isCurrent: text("is_current").default("false"),
  description: text("description"),
  isGigWork: text("is_gig_work").default("false"),
  sortOrder: integer("sort_order").default(0),
});

export const resumeEducationTable = pgTable("resume_education", {
  id: serial("id").primaryKey(),
  resumeId: integer("resume_id").notNull().references(() => resumesTable.id, { onDelete: "cascade" }),
  school: text("school").notNull(),
  degree: text("degree"),
  field: text("field"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  sortOrder: integer("sort_order").default(0),
});

export const savedJobsTable = pgTable("saved_jobs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  jobTitle: text("job_title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  salary: text("salary"),
  jobType: text("job_type"),
  sourceUrl: text("source_url"),
  source: text("source"),
  externalId: text("external_id"),
  savedAt: timestamp("saved_at", { withTimezone: true }).defaultNow(),
});

export type Resume = typeof resumesTable.$inferSelect;
export type InsertResume = typeof resumesTable.$inferInsert;
export type ResumeExperience = typeof resumeExperiencesTable.$inferSelect;
export type InsertResumeExperience = typeof resumeExperiencesTable.$inferInsert;
export type ResumeEducation = typeof resumeEducationTable.$inferSelect;
export type InsertResumeEducation = typeof resumeEducationTable.$inferInsert;
export type SavedJob = typeof savedJobsTable.$inferSelect;
export type InsertSavedJob = typeof savedJobsTable.$inferInsert;
