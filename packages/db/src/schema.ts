import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

export const planEnum = pgEnum("plan", ["free", "pro", "pro_voice", "team"]);
export const sessionStatusEnum = pgEnum("session_status", [
  "active",
  "completed",
  "abandoned",
]);
export const sessionModeEnum = pgEnum("session_mode", ["chat", "voice", "hybrid"]);
export const difficultyEnum = pgEnum("difficulty", [
  "junior",
  "mid",
  "senior",
  "staff",
]);
export const phaseEnum = pgEnum("phase", [
  "clarification",
  "high_level",
  "deep_dive",
  "wrap_up",
]);
export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);
export const messageSourceEnum = pgEnum("message_source", [
  "chat",
  "voice_transcript",
  "observation",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").unique().notNull(),
  email: text("email").unique().notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  plan: planEnum("plan").default("free"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const problems = pgTable("problems", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  difficulty: difficultyEnum("difficulty").notNull(),
  category: text("category").array().default([]),
  companies: text("companies").array().default([]),
  timeLimit: integer("time_limit").default(45),
  statement: text("statement").notNull(),
  clarifications: jsonb("clarifications").default([]),
  evaluationGuide: jsonb("evaluation_guide").notNull(),
  referenceDesign: jsonb("reference_design"),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    problemId: text("problem_id")
      .references(() => problems.id)
      .notNull(),
    status: sessionStatusEnum("status").default("active"),
    mode: sessionModeEnum("mode").default("chat"),
    difficulty: difficultyEnum("difficulty"),
    currentPhase: phaseEnum("current_phase").default("clarification"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSec: integer("duration_sec"),
  },
  (table) => [
    index("sessions_user_idx").on(table.userId),
    index("sessions_status_idx").on(table.status),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .references(() => sessions.id, { onDelete: "cascade" })
      .notNull(),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    source: messageSourceEnum("source").default("chat"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("messages_session_idx").on(table.sessionId)]
);

export const diagramSnapshots = pgTable(
  "diagram_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .references(() => sessions.id, { onDelete: "cascade" })
      .notNull(),
    graphJson: jsonb("graph_json").notNull(),
    trigger: text("trigger").default("change"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("snapshots_session_idx").on(table.sessionId)]
);

export const observations = pgTable(
  "observations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .references(() => sessions.id, { onDelete: "cascade" })
      .notNull(),
    category: text("category"),
    priority: text("priority"),
    observation: text("observation"),
    suggestedQuestion: text("suggested_question"),
    actionTaken: text("action_taken"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("observations_session_idx").on(table.sessionId)]
);

export const evaluations = pgTable("evaluations", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .references(() => sessions.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  overallScore: integer("overall_score"),
  summary: text("summary"),
  dimensions: jsonb("dimensions"),
  strengths: jsonb("strengths"),
  improvements: jsonb("improvements"),
  detailed: jsonb("detailed"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
