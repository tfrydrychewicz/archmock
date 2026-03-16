# ArchMock MVP — Szczegółowy Plan Implementacji

## Wersja: 1.0 | Data: 2026-03-16

---

## 1. Zakres MVP

### Co WCHODZI do MVP

- Rejestracja/login (email + Google OAuth)
- Bank 10 ręcznie napisanych problemów SD
- Whiteboard z custom kształtami SD (service, DB, cache, queue, LB, CDN, client, storage, zone, arrow)
- Ekstrakcja DiagramGraph z canvasu → JSON
- Chat z AI interviewerem (Claude Sonnet, streaming)
- Obserwacja diagramu przez AI w real-time (graph JSON, bez vision)
- Interjection engine — AI reaguje na zmiany na canvasie
- Ewaluacja końcowa sesji (Claude Opus)
- Historia sesji z wynikami
- Eksport sesji do PDF

### Co NIE WCHODZI do MVP

- Voice agent (Phase 2)
- Vision-based diagram analysis / PNG snapshots (Phase 2)
- Billing / Stripe (Phase 2)
- Multiplayer (Phase 3+)
- Community problems (Phase 3+)
- Marketplace / B2B dashboard (Phase 3+)

### Kluczowe Decyzje Architektoniczne (Local → Production)

| Warstwa | Lokalnie | Produkcja | Co się zmienia |
|---|---|---|---|
| Frontend | `next dev` na localhost:3000 | Vercel | Nic — `git push` deplouje |
| Backend WS | Hono na localhost:4000 | Fly.io | Dockerfile ten sam, zmiana env vars |
| PostgreSQL | Docker container, port 5432 | Neon / Supabase | Connection string w `.env` |
| Redis | Docker container, port 6379 | Upstash | Connection string w `.env` |
| File storage | Lokalny folder `./storage/` | Cloudflare R2 / S3 | Adapter pattern — StorageService interface |
| AI | Claude API (cloud) | Claude API (cloud) | Bez zmian |
| Auth | Clerk dev mode | Clerk production | Zmiana kluczy w `.env` |

**Zasada**: Każda zależność na infrastrukturę jest za abstrakcją. Kod aplikacji nie wie czy rozmawia z lokalnym Dockerem czy z produkcyjnym Neon.

---

## 2. Struktura Projektu

```
archmock/
├── docker-compose.yml              # PostgreSQL + Redis (local dev)
├── .env.local                      # Sekrety lokalne (nie w git)
├── .env.example                    # Template env vars
├── turbo.json                      # Turborepo config
├── package.json                    # Root workspace
│
├── apps/
│   ├── web/                        # Next.js 15 frontend
│   │   ├── src/
│   │   │   ├── app/                # App Router
│   │   │   │   ├── (auth)/         # Login, register
│   │   │   │   ├── (dashboard)/    # Problem list, history, stats
│   │   │   │   ├── session/[id]/   # Main interview session page
│   │   │   │   └── api/            # REST API routes (Next.js)
│   │   │   ├── components/
│   │   │   │   ├── whiteboard/     # tldraw wrapper + custom shapes
│   │   │   │   ├── chat/           # Chat panel
│   │   │   │   ├── session/        # Session controls, timer, phase
│   │   │   │   └── ui/             # shadcn/ui components
│   │   │   ├── stores/             # Zustand stores
│   │   │   ├── hooks/              # Custom React hooks
│   │   │   ├── lib/                # Utilities, API client, types
│   │   │   └── styles/             # Tailwind + globals
│   │   ├── public/
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   └── ws-server/                  # Hono WebSocket backend
│       ├── src/
│       │   ├── index.ts            # Server entrypoint
│       │   ├── routes/
│       │   │   ├── session.ws.ts   # WebSocket handler
│       │   │   └── health.ts       # Health check
│       │   ├── services/
│       │   │   ├── interviewer/    # AI interviewer agent
│       │   │   │   ├── agent.ts        # Main agent orchestrator
│       │   │   │   ├── prompts.ts      # System prompts
│       │   │   │   ├── observer.ts     # Diagram observation engine
│       │   │   │   └── evaluator.ts    # Final evaluation generator
│       │   │   ├── diagram/        # Diagram analysis
│       │   │   │   ├── graph.ts        # DiagramGraph types + parsing
│       │   │   │   ├── analyzer.ts     # Static analysis rules
│       │   │   │   └── differ.ts       # Change detection
│       │   │   └── session/        # Session state machine
│       │   │       ├── manager.ts      # Session lifecycle
│       │   │       └── phases.ts       # Phase transitions
│       │   ├── infra/              # Infrastructure adapters
│       │   │   ├── db.ts               # Drizzle + connection
│       │   │   ├── redis.ts            # Redis client
│       │   │   ├── storage.ts          # File storage adapter
│       │   │   └── ai.ts              # Anthropic SDK wrapper
│       │   └── ws/                 # WebSocket protocol
│       │       ├── protocol.ts         # Message types
│       │       ├── handler.ts          # Message routing
│       │       └── auth.ts             # WS authentication
│       ├── Dockerfile
│       └── tsconfig.json
│
├── packages/
│   ├── shared/                     # Shared types + constants
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── diagram.ts          # DiagramGraph, SDShapeType
│   │   │   │   ├── session.ts          # Session, Evaluation
│   │   │   │   ├── problem.ts          # Problem bank types
│   │   │   │   └── ws.ts              # WebSocket message types
│   │   │   ├── constants/
│   │   │   │   ├── shapes.ts           # Shape definitions
│   │   │   │   └── phases.ts           # Interview phases
│   │   │   └── index.ts
│   │   └── tsconfig.json
│   │
│   └── db/                         # Database package
│       ├── src/
│       │   ├── schema.ts               # Drizzle schema
│       │   ├── migrations/             # SQL migrations
│       │   └── seed.ts                 # Problem bank seed data
│       ├── drizzle.config.ts
│       └── tsconfig.json
│
├── problems/                       # Problem definitions (YAML/JSON)
│   ├── url-shortener.yaml
│   ├── twitter-feed.yaml
│   ├── chat-system.yaml
│   └── ...
│
└── scripts/
    ├── setup.sh                    # One-command local setup
    ├── seed-problems.ts            # Load problems into DB
    └── generate-problem.ts         # AI-assisted problem creation helper
```

---

## 3. Environment Setup

### 3.1 Prerequisites

```bash
# Wymagane
node >= 22.0.0 (LTS)
pnpm >= 9.0
docker >= 24.0
git

# Opcjonalne
# Konto Clerk (darmowe dev) — https://clerk.com
# Klucz API Anthropic — https://console.anthropic.com
```

### 3.2 docker-compose.yml

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    container_name: archmock-db
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: archmock
      POSTGRES_USER: archmock
      POSTGRES_PASSWORD: archmock_dev
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U archmock"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: archmock-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

### 3.3 .env.example

```bash
# === Database ===
DATABASE_URL=postgresql://archmock:archmock_dev@localhost:5432/archmock

# === Redis ===
REDIS_URL=redis://localhost:6379

# === Auth (Clerk) ===
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# === AI ===
ANTHROPIC_API_KEY=sk-ant-...
# Model overrides (defaults shown)
AI_MODEL_REALTIME=claude-sonnet-4-6
AI_MODEL_EVALUATION=claude-opus-4-6

# === WebSocket Server ===
WS_SERVER_URL=ws://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000

# === Storage (local mode) ===
STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=./storage

# === App ===
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3.4 setup.sh (jednokomendowy setup)

```bash
#!/bin/bash
set -e

echo "🏗️  ArchMock — Local Setup"
echo "========================="

# 1. Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# 2. Start infra
echo "🐳 Starting Docker services..."
docker compose up -d
echo "⏳ Waiting for PostgreSQL..."
sleep 3

# 3. Setup database
echo "🗄️  Running migrations..."
pnpm --filter @archmock/db migrate

# 4. Seed problem bank
echo "📝 Seeding problems..."
pnpm --filter @archmock/db seed

# 5. Create local storage dir
mkdir -p storage/exports storage/snapshots

# 6. Check env
if [ ! -f .env.local ]; then
  echo ""
  echo "⚠️  .env.local not found. Copy .env.example and fill in:"
  echo "   cp .env.example .env.local"
  echo ""
  echo "   Required: ANTHROPIC_API_KEY, Clerk keys"
  exit 1
fi

echo ""
echo "✅ Setup complete! Run:"
echo "   pnpm dev          # Start frontend + WS server"
echo "   Open http://localhost:3000"
```

---

## 4. Database Schema (Drizzle)

```typescript
// packages/db/src/schema.ts

import {
  pgTable, uuid, text, timestamp, integer,
  jsonb, boolean, pgEnum, index
} from 'drizzle-orm/pg-core'

export const planEnum = pgEnum('plan', ['free', 'pro', 'pro_voice', 'team'])
export const sessionStatusEnum = pgEnum('session_status', ['active', 'completed', 'abandoned'])
export const sessionModeEnum = pgEnum('session_mode', ['chat', 'voice', 'hybrid'])
export const difficultyEnum = pgEnum('difficulty', ['junior', 'mid', 'senior', 'staff'])
export const phaseEnum = pgEnum('phase', ['clarification', 'high_level', 'deep_dive', 'wrap_up'])
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system'])
export const messageSourceEnum = pgEnum('message_source', ['chat', 'voice_transcript', 'observation'])

// ── Users ────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').unique().notNull(),
  email: text('email').unique().notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  plan: planEnum('plan').default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── Problems ─────────────────────────────────────
export const problems = pgTable('problems', {
  id: text('id').primaryKey(),                    // slug: "url-shortener"
  title: text('title').notNull(),
  difficulty: difficultyEnum('difficulty').notNull(),
  category: text('category').array().default([]),
  companies: text('companies').array().default([]),
  timeLimit: integer('time_limit').default(45),   // minutes
  statement: text('statement').notNull(),
  clarifications: jsonb('clarifications').default([]),
  evaluationGuide: jsonb('evaluation_guide').notNull(),
  referenceDesign: jsonb('reference_design'),
  isPublished: boolean('is_published').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── Sessions ─────────────────────────────────────
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  problemId: text('problem_id').references(() => problems.id).notNull(),
  status: sessionStatusEnum('status').default('active'),
  mode: sessionModeEnum('mode').default('chat'),
  difficulty: difficultyEnum('difficulty'),
  currentPhase: phaseEnum('current_phase').default('clarification'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  durationSec: integer('duration_sec'),
}, (table) => [
  index('sessions_user_idx').on(table.userId),
  index('sessions_status_idx').on(table.status),
])

// ── Messages ─────────────────────────────────────
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  source: messageSourceEnum('source').default('chat'),
  metadata: jsonb('metadata'),                    // optional: diagram snapshot ref, etc.
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('messages_session_idx').on(table.sessionId),
])

// ── Diagram Snapshots ────────────────────────────
export const diagramSnapshots = pgTable('diagram_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  graphJson: jsonb('graph_json').notNull(),        // DiagramGraph
  trigger: text('trigger').default('change'),      // 'change' | 'periodic' | 'final'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('snapshots_session_idx').on(table.sessionId),
])

// ── AI Observations (internal log) ───────────────
export const observations = pgTable('observations', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  category: text('category'),                     // scaling, failure, trade-off, etc.
  priority: text('priority'),                     // low, medium, high, critical
  observation: text('observation'),
  suggestedQuestion: text('suggested_question'),
  actionTaken: text('action_taken'),              // interjected, queued, suppressed
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('observations_session_idx').on(table.sessionId),
])

// ── Evaluations ──────────────────────────────────
export const evaluations = pgTable('evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).unique().notNull(),
  overallScore: integer('overall_score'),         // 1-4
  summary: text('summary'),
  dimensions: jsonb('dimensions'),                // DimensionScore[]
  strengths: jsonb('strengths'),                  // string[]
  improvements: jsonb('improvements'),            // string[]
  detailed: jsonb('detailed'),                    // detailed feedback
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```

---

## 5. Kluczowe Typy (packages/shared)

```typescript
// packages/shared/src/types/diagram.ts

export type SDShapeType =
  | 'sd-service'
  | 'sd-database'
  | 'sd-cache'
  | 'sd-queue'
  | 'sd-load-balancer'
  | 'sd-cdn'
  | 'sd-client'
  | 'sd-storage'
  | 'sd-zone'

export type SDProtocol = 'http' | 'grpc' | 'websocket' | 'async' | 'tcp' | 'custom'

export interface DiagramNode {
  id: string
  type: SDShapeType
  label: string
  subLabel?: string           // "PostgreSQL", "Redis", "Kafka"
  techChoice?: string
  position: { x: number; y: number }
  zone?: string               // parent zone ID
  annotations?: string[]
  metrics?: {
    rps?: string
    latency?: string
    storage?: string
    throughput?: string
  }
}

export interface DiagramEdge {
  id: string
  from: string
  to: string
  label?: string
  protocol?: SDProtocol
  isAsync?: boolean
  dataFlow?: string           // "user events", "notifications"
}

export interface DiagramZone {
  id: string
  label: string
  childNodeIds: string[]
}

export interface DiagramGraph {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  zones: DiagramZone[]
  metadata?: {
    nodeCount: number
    edgeCount: number
    hasRedundancy: boolean
    hasCaching: boolean
    hasAsyncProcessing: boolean
    hasLoadBalancing: boolean
  }
}

// packages/shared/src/types/ws.ts

export type ClientMessage =
  | { type: 'chat.send'; content: string }
  | { type: 'diagram.update'; graph: DiagramGraph }
  | { type: 'session.end' }
  | { type: 'session.request_evaluation' }
  | { type: 'ping' }

export type ServerMessage =
  | { type: 'chat.stream'; delta: string; messageId: string }
  | { type: 'chat.done'; messageId: string; content: string }
  | { type: 'observation.interjection'; content: string; messageId: string }
  | { type: 'session.phase_change'; phase: Phase; message: string }
  | { type: 'session.evaluation_ready'; evaluationId: string }
  | { type: 'session.evaluation_progress'; step: string }
  | { type: 'error'; code: string; message: string }
  | { type: 'pong' }

// packages/shared/src/types/problem.ts

export interface SDProblem {
  id: string
  title: string
  difficulty: 'junior' | 'mid' | 'senior' | 'staff'
  category: string[]
  companies: string[]
  timeLimit: number

  statement: string
  clarifications: {
    question: string
    answer: string
    keywords: string[]        // trigger words to match user questions
  }[]

  evaluationGuide: {
    expectedComponents: string[]
    scalingConcerns: string[]
    commonMistakes: string[]
    deepDiveTopics: string[]
    followUpConstraints: string[]
    exampleGoodQuestions: string[]  // what good clarifying Q's look like
  }

  referenceDesign?: DiagramGraph
}

// packages/shared/src/types/evaluation.ts

export interface Evaluation {
  overall: {
    score: number             // 1-4
    label: 'No Hire' | 'Lean No' | 'Lean Yes' | 'Strong Yes'
    summary: string
  }
  dimensions: {
    requirementsGathering: DimensionScore
    highLevelDesign: DimensionScore
    componentDesign: DimensionScore
    scalability: DimensionScore
    tradeoffs: DimensionScore
    communication: DimensionScore
    technicalDepth: DimensionScore
  }
  strengths: string[]
  areasForImprovement: string[]
  detailedFeedback: {
    diagramFeedback: string
    missedConsiderations: string[]
    suggestedReadings: string[]
  }
}

export interface DimensionScore {
  score: number               // 1-4
  rationale: string
  examples: string[]          // specific moments from the session
}
```

---

## 6. AI Interviewer — Prompts & Logic

### 6.1 System Prompt (Główny)

```typescript
// apps/ws-server/src/services/interviewer/prompts.ts

export function buildInterviewerSystemPrompt(
  problem: SDProblem,
  phase: Phase,
  diagram: DiagramGraph,
  sessionDuration: number,
  elapsedMinutes: number
): string {
  return `You are a system design interviewer at a top tech company.
You are conducting a ${sessionDuration}-minute system design interview.
${elapsedMinutes} minutes have elapsed. Current phase: ${phase}.

## THE PROBLEM
Title: ${problem.title}
Statement: ${problem.statement}

## YOUR KNOWLEDGE (do not share directly)
Expected components: ${problem.evaluationGuide.expectedComponents.join(', ')}
Common mistakes to watch for: ${problem.evaluationGuide.commonMistakes.join(', ')}
Good deep-dive topics: ${problem.evaluationGuide.deepDiveTopics.join(', ')}

## CURRENT DIAGRAM STATE
\`\`\`json
${JSON.stringify(diagram, null, 2)}
\`\`\`

## BEHAVIORAL RULES

### Phase-specific behavior:

**CLARIFICATION (first 5 min):**
- Let the candidate ask questions. Be ready with answers from the clarifications list.
- If they dive into design without asking questions, gently say:
  "Before we start designing, do you have any questions about the requirements?"
- Answer scope/scale questions specifically. Be vague on design decisions
  ("That's a good question — what do you think would work?").

**HIGH-LEVEL DESIGN (5-20 min):**
- Expect a rough end-to-end architecture.
- If they go too deep too early: "Let's step back — can you walk me through the
  full request flow from client to response first?"
- Encourage them to identify main components and data flow before detailing any one part.

**DEEP-DIVE (20-40 min):**
- Push on 1-2 areas: scaling bottlenecks, failure modes, data consistency.
- Ask specific quantitative questions: "If we have 10M DAU, how many writes per second
  is that for this service?"
- Challenge their tech choices: "Why Redis here instead of Memcached? What's the trade-off?"

**WRAP-UP (last 5 min):**
- "We're running low on time. Can you summarize the main trade-offs in your design?"
- "If you had another hour, what would you change or add?"
- Don't introduce new topics.

### General rules:
1. NEVER give the answer. Ask Socratic questions.
2. When you see a mistake in the diagram, don't say "that's wrong."
   Ask a question that exposes the issue naturally.
3. Reference specific components by their label from the diagram JSON.
4. Keep responses concise (2-4 sentences typically). This is a conversation, not a lecture.
5. Be warm but professional.
6. If the candidate seems stuck for >2 minutes, offer a gentle nudge:
   "Would it help to think about what happens when a user sends a request?"
7. Only comment on what IS in the diagram. Never hallucinate components that aren't there.
8. Respond in the same language the candidate uses.`
}
```

### 6.2 Observation Engine

```typescript
// apps/ws-server/src/services/interviewer/observer.ts

import Anthropic from '@anthropic-ai/sdk'
import type { DiagramGraph, SDProblem } from '@archmock/shared'

interface ObservationResult {
  shouldInterject: boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
  observation: string
  suggestedQuestion: string
  category: string
}

export class DiagramObserver {
  private lastObservationAt: number = 0
  private observationQueue: ObservationResult[] = []
  private COOLDOWN_MS = 90_000  // 90 seconds between interjections

  constructor(
    private ai: Anthropic,
    private problem: SDProblem,
  ) {}

  async analyze(
    currentGraph: DiagramGraph,
    previousGraph: DiagramGraph | null,
    conversationSummary: string,
    phase: string,
  ): Promise<ObservationResult | null> {

    // 1. Static analysis (instant, no AI call)
    const staticIssues = this.runStaticAnalysis(currentGraph)

    // 2. Change diff
    const changes = this.computeChanges(currentGraph, previousGraph)
    if (changes.length === 0 && staticIssues.length === 0) return null

    // 3. AI analysis
    const prompt = `You are analyzing a system design diagram for: "${this.problem.title}"

Current diagram:
${JSON.stringify(currentGraph, null, 2)}

Recent changes: ${changes.join('; ') || 'none'}
Static analysis issues: ${staticIssues.join('; ') || 'none'}
Current phase: ${phase}
Recent conversation context: ${conversationSummary}

Expected components for a good solution: ${this.problem.evaluationGuide.expectedComponents.join(', ')}

Decide: should the interviewer interject right now?
Consider:
- Is there a significant issue worth addressing?
- Is this the right moment (not mid-thought)?
- Would a real interviewer comment on this?

Respond in JSON:
{
  "shouldInterject": boolean,
  "priority": "low" | "medium" | "high" | "critical",
  "observation": "what you noticed (internal, not shown to user)",
  "suggestedQuestion": "the question to ask the candidate (Socratic, not lecturing)",
  "category": "scaling" | "failure" | "trade-off" | "missing-component" | "architecture" | "data-model"
}`

    const response = await this.ai.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const result: ObservationResult = JSON.parse(text)

    // 4. Apply cooldown
    const now = Date.now()
    if (result.shouldInterject && result.priority !== 'critical') {
      if (now - this.lastObservationAt < this.COOLDOWN_MS) {
        this.observationQueue.push(result)
        return null
      }
    }

    if (result.shouldInterject) {
      this.lastObservationAt = now
    }

    return result
  }

  private runStaticAnalysis(graph: DiagramGraph): string[] {
    const issues: string[] = []

    // Single points of failure
    const dbNodes = graph.nodes.filter(n => n.type === 'sd-database')
    for (const db of dbNodes) {
      const incomingEdges = graph.edges.filter(e => e.to === db.id)
      if (incomingEdges.length > 2) {
        const hasCache = graph.nodes.some(n =>
          n.type === 'sd-cache' &&
          graph.edges.some(e => e.from === n.id && e.to === db.id)
        )
        if (!hasCache) {
          issues.push(`Database "${db.label}" has ${incomingEdges.length} direct connections with no cache layer`)
        }
      }
    }

    // No load balancer with multiple services
    const services = graph.nodes.filter(n => n.type === 'sd-service')
    const hasLB = graph.nodes.some(n => n.type === 'sd-load-balancer')
    if (services.length > 2 && !hasLB) {
      issues.push('Multiple services but no load balancer')
    }

    // All sync, no async processing
    const hasAsync = graph.edges.some(e => e.isAsync)
    const hasQueue = graph.nodes.some(n => n.type === 'sd-queue')
    if (graph.edges.length > 4 && !hasAsync && !hasQueue) {
      issues.push('All connections appear synchronous — no async processing')
    }

    // Disconnected nodes
    const connectedNodeIds = new Set([
      ...graph.edges.map(e => e.from),
      ...graph.edges.map(e => e.to),
    ])
    const disconnected = graph.nodes.filter(n =>
      n.type !== 'sd-zone' && !connectedNodeIds.has(n.id)
    )
    if (disconnected.length > 0) {
      issues.push(`Disconnected components: ${disconnected.map(n => n.label).join(', ')}`)
    }

    return issues
  }

  private computeChanges(
    current: DiagramGraph,
    previous: DiagramGraph | null
  ): string[] {
    if (!previous) return ['Initial diagram created']

    const changes: string[] = []
    const prevNodeIds = new Set(previous.nodes.map(n => n.id))
    const currNodeIds = new Set(current.nodes.map(n => n.id))

    // New nodes
    for (const node of current.nodes) {
      if (!prevNodeIds.has(node.id)) {
        changes.push(`Added ${node.type}: "${node.label}"`)
      }
    }

    // Removed nodes
    for (const node of previous.nodes) {
      if (!currNodeIds.has(node.id)) {
        changes.push(`Removed ${node.type}: "${node.label}"`)
      }
    }

    // New edges
    const prevEdgeKeys = new Set(previous.edges.map(e => `${e.from}->${e.to}`))
    for (const edge of current.edges) {
      if (!prevEdgeKeys.has(`${edge.from}->${edge.to}`)) {
        const fromNode = current.nodes.find(n => n.id === edge.from)
        const toNode = current.nodes.find(n => n.id === edge.to)
        changes.push(`Connected "${fromNode?.label}" → "${toNode?.label}"${edge.label ? ` (${edge.label})` : ''}`)
      }
    }

    return changes
  }
}
```

### 6.3 Evaluation Generator

```typescript
// apps/ws-server/src/services/interviewer/evaluator.ts

export function buildEvaluationPrompt(
  problem: SDProblem,
  finalDiagram: DiagramGraph,
  diagramHistory: { graph: DiagramGraph; timestamp: string }[],
  conversationTranscript: string,
  observations: { observation: string; category: string; actionTaken: string }[],
  sessionDurationMin: number,
): string {
  return `You are evaluating a system design interview session.

## Problem
Title: ${problem.title}
Statement: ${problem.statement}
Difficulty: ${problem.difficulty}
Time limit: ${problem.timeLimit} min (actual: ${sessionDurationMin} min)

## Expected Solution Components
${problem.evaluationGuide.expectedComponents.map(c => `- ${c}`).join('\n')}

## Common Mistakes
${problem.evaluationGuide.commonMistakes.map(m => `- ${m}`).join('\n')}

## Final Diagram
\`\`\`json
${JSON.stringify(finalDiagram, null, 2)}
\`\`\`

## Diagram Evolution (${diagramHistory.length} snapshots)
${diagramHistory.map((s, i) => `Snapshot ${i + 1} (${s.timestamp}): ${s.graph.nodes.length} nodes, ${s.graph.edges.length} edges`).join('\n')}

## Full Conversation Transcript
${conversationTranscript}

## AI Observations During Session
${observations.map(o => `[${o.category}] ${o.observation} → ${o.actionTaken}`).join('\n')}

## Evaluation Instructions

Score on a 1-4 scale:
1 = No Hire (fundamental gaps, unable to make progress)
2 = Lean No (some understanding but significant weaknesses)
3 = Lean Yes (solid overall with minor gaps)
4 = Strong Yes (excellent across all dimensions)

Respond in JSON matching this exact schema:
{
  "overall": {
    "score": number,
    "label": "No Hire" | "Lean No" | "Lean Yes" | "Strong Yes",
    "summary": "2-3 sentence overall assessment"
  },
  "dimensions": {
    "requirementsGathering": {
      "score": number,
      "rationale": "string",
      "examples": ["specific moments from the session"]
    },
    "highLevelDesign": { ... },
    "componentDesign": { ... },
    "scalability": { ... },
    "tradeoffs": { ... },
    "communication": { ... },
    "technicalDepth": { ... }
  },
  "strengths": ["string"],
  "areasForImprovement": ["string"],
  "detailedFeedback": {
    "diagramFeedback": "specific comments on the final diagram",
    "missedConsiderations": ["things they didn't address"],
    "suggestedReadings": ["resources to study"]
  }
}

Be fair but rigorous. Reference specific moments from the transcript and specific
components from the diagram. Don't be generic.`
}
```

---

## 7. WebSocket Session Flow

```
  Client (Browser)                          WS Server (Hono)
  ─────────────────                         ─────────────────
        │                                         │
        │──── WS Connect + auth token ───────────►│
        │                                         │ Validate token
        │                                         │ Load session from DB
        │◄─── session.init { problem, phase } ────│
        │                                         │
        │                                         │
   ┌────┼─── INTERVIEW LOOP ─────────────────────┼────┐
   │    │                                         │    │
   │    │──── chat.send { content } ─────────────►│    │
   │    │                                         │    │ Build prompt with:
   │    │                                         │    │  - system prompt
   │    │                                         │    │  - conversation history
   │    │                                         │    │  - current diagram
   │    │◄─── chat.stream { delta } ──────────────│    │ Stream Claude response
   │    │◄─── chat.stream { delta } ──────────────│    │
   │    │◄─── chat.done { messageId } ────────────│    │
   │    │                                         │    │
   │    │──── diagram.update { graph } ──────────►│    │
   │    │                                         │    │ Debounce (2s)
   │    │                                         │    │ Diff vs previous
   │    │                                         │    │ Run Observer
   │    │                                         │    │
   │    │  (if AI decides to interject)           │    │
   │    │◄─── observation.interjection ───────────│    │
   │    │                                         │    │
   │    │  (phase transition detected)            │    │
   │    │◄─── session.phase_change ───────────────│    │
   │    │                                         │    │
   └────┼─────────────────────────────────────────┼────┘
        │                                         │
        │──── session.end ───────────────────────►│
        │                                         │ Save final snapshot
        │◄─── session.evaluation_progress ────────│ "Analyzing conversation..."
        │◄─── session.evaluation_progress ────────│ "Evaluating diagram..."
        │◄─── session.evaluation_progress ────────│ "Generating feedback..."
        │                                         │ Call Claude Opus
        │◄─── session.evaluation_ready ───────────│
        │                                         │
```

---

## 8. tldraw Custom Shapes — Implementation Approach

### 8.1 Shape Definition Pattern

```typescript
// apps/web/src/components/whiteboard/shapes/sd-service.tsx

import {
  ShapeUtil, TLBaseShape, HTMLContainer, Rectangle2d,
  type TLOnResizeHandler
} from 'tldraw'

// 1. Define shape type
type SDServiceShape = TLBaseShape<'sd-service', {
  w: number
  h: number
  label: string
  subLabel: string
  techChoice: string
}>

// 2. Create ShapeUtil
export class SDServiceShapeUtil extends ShapeUtil<SDServiceShape> {
  static override type = 'sd-service' as const

  getDefaultProps(): SDServiceShape['props'] {
    return { w: 200, h: 80, label: 'Service', subLabel: '', techChoice: '' }
  }

  getGeometry(shape: SDServiceShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
  }

  component(shape: SDServiceShape) {
    return (
      <HTMLContainer>
        <div className="sd-service-shape">
          <div className="sd-icon">⚙️</div>
          <div className="sd-label">{shape.props.label}</div>
          {shape.props.subLabel && (
            <div className="sd-sublabel">{shape.props.subLabel}</div>
          )}
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: SDServiceShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} />
  }

  override onResize: TLOnResizeHandler<SDServiceShape> = (shape, info) => {
    return { props: { w: Math.max(120, info.bounds.w), h: Math.max(60, info.bounds.h) } }
  }
}
```

### 8.2 Kształty do zaimplementowania (MVP)

| Kształt | Ikona | Wygląd | Pola |
|---|---|---|---|
| `sd-service` | ⚙️ | Zaokrąglony prostokąt, niebieskie tło | label, subLabel, techChoice |
| `sd-database` | 🗄️ | Cylinder | label, subLabel (SQL/NoSQL/Graph) |
| `sd-cache` | ⚡ | Prostokąt z przerywanymi krawędziami | label, subLabel (Redis/Memcached) |
| `sd-queue` | 📨 | Prostokąt ze strzałką-kolejką | label, subLabel (Kafka/SQS/RabbitMQ) |
| `sd-load-balancer` | ⚖️ | Romb / diament | label, subLabel (L4/L7/API GW) |
| `sd-cdn` | 🌐 | Chmurka | label |
| `sd-client` | 📱 | Prostokąt z ikoną urządzenia | label (Browser/Mobile/IoT) |
| `sd-storage` | 📦 | Parallelogram | label, subLabel (S3/GCS/Blob) |
| `sd-zone` | — | Przerywanym prostokąt, semi-transparentne tło | label (VPC/Region/AZ) |

### 8.3 Graph Extraction z tldraw

```typescript
// apps/web/src/components/whiteboard/graph-extractor.ts

import { Editor } from 'tldraw'
import type { DiagramGraph, DiagramNode, DiagramEdge, DiagramZone } from '@archmock/shared'

export function extractDiagramGraph(editor: Editor): DiagramGraph {
  const allShapes = editor.getCurrentPageShapes()

  const nodes: DiagramNode[] = allShapes
    .filter(s => s.type.startsWith('sd-') && s.type !== 'sd-zone')
    .map(s => ({
      id: s.id,
      type: s.type as DiagramNode['type'],
      label: (s.props as any).label ?? '',
      subLabel: (s.props as any).subLabel,
      techChoice: (s.props as any).techChoice,
      position: { x: s.x, y: s.y },
      zone: findParentZone(s, allShapes)?.id,
      metrics: (s.props as any).metrics,
    }))

  const edges: DiagramEdge[] = allShapes
    .filter(s => s.type === 'arrow')
    .map(s => {
      const bindings = editor.getBindingsFromShape(s, 'arrow')
      return {
        id: s.id,
        from: bindings.find(b => b.props.terminal === 'start')?.toId ?? '',
        to: bindings.find(b => b.props.terminal === 'end')?.toId ?? '',
        label: (s.props as any).text,
        protocol: inferProtocol((s.props as any).text),
        isAsync: inferAsync((s.props as any).text),
      }
    })
    .filter(e => e.from && e.to)

  const zones: DiagramZone[] = allShapes
    .filter(s => s.type === 'sd-zone')
    .map(z => ({
      id: z.id,
      label: (z.props as any).label ?? '',
      childNodeIds: nodes.filter(n => n.zone === z.id).map(n => n.id),
    }))

  const metadata = {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    hasRedundancy: checkRedundancy(nodes, edges),
    hasCaching: nodes.some(n => n.type === 'sd-cache'),
    hasAsyncProcessing: edges.some(e => e.isAsync) || nodes.some(n => n.type === 'sd-queue'),
    hasLoadBalancing: nodes.some(n => n.type === 'sd-load-balancer'),
  }

  return { nodes, edges, zones, metadata }
}
```

---

## 9. Sprint Plan (10 tygodni)

### Sprint 0 — Fundament (Tydzień 1)

| Zadanie | Estymacja | Opis |
|---|---|---|
| Monorepo setup (turborepo + pnpm) | 2h | Struktura katalogów, workspace config |
| Docker compose + scripts/setup.sh | 1h | PG + Redis lokalne |
| Next.js 15 app scaffold | 2h | App Router, Tailwind v4, shadcn/ui init |
| Hono WS server scaffold | 2h | Basic HTTP + WS server z Dockerfile |
| Drizzle schema + migrations | 3h | Cały schema z §4, first migration |
| Shared types package | 2h | DiagramGraph, WS protocol, Problem types |
| Clerk auth integration | 3h | Sign-in, sign-up, middleware, user sync |
| CI pipeline (GitHub Actions) | 2h | Lint, typecheck, build, test |
| **Sprint 0 Total** | **~17h** | |

**Deliverable**: `pnpm dev` uruchamia frontend + backend, user może się zalogować, widzi pusty dashboard.

### Sprint 1 — Whiteboard Core (Tydzień 2-3)

| Zadanie | Estymacja | Opis |
|---|---|---|
| tldraw integration + customization | 4h | Embed tldraw, custom toolbar, dark theme |
| sd-service shape | 4h | First custom shape, full implementation pattern |
| sd-database shape | 2h | Cylinder rendering |
| sd-cache shape | 2h | Dashed border style |
| sd-queue shape | 2h | Queue visual |
| sd-load-balancer shape | 2h | Diamond / hexagon |
| sd-client, sd-cdn, sd-storage shapes | 3h | Simpler shapes, batch implement |
| sd-zone shape (grouping container) | 4h | Semi-transparent container with nesting |
| Custom toolbar / shape palette | 4h | Sidebar z drag-and-drop shape palette |
| Arrow labels + protocol styling | 3h | Sync solid, async dashed, label on arrow |
| Graph extractor (tldraw → DiagramGraph) | 4h | Core extraction logic z §8.3 |
| Graph extractor tests | 3h | Unit tests for extraction edge cases |
| **Sprint 1 Total** | **~37h** | |

**Deliverable**: Pełny whiteboard z wszystkimi SD shapes. User może rysować diagramy. DiagramGraph JSON jest dostępny w konsoli.

### Sprint 2 — Problem Bank & Session Flow (Tydzień 4)

| Zadanie | Estymacja | Opis |
|---|---|---|
| Problem YAML format + loader | 3h | Parse YAML → DB, validation |
| 3 core problems (URL Shortener, Chat, Feed) | 8h | Pełne problemy z clarifications + eval guide |
| Problem selection page (dashboard) | 3h | Grid z filtrami difficulty/category |
| Session creation flow | 3h | Start session → redirect to session page |
| Session page layout | 4h | Split view: whiteboard (70%) + chat panel (30%) |
| Session timer + phase indicator | 2h | Countdown, current phase badge |
| Session persistence (auto-save) | 2h | Save diagram state on change, restore on reload |
| **Sprint 2 Total** | **~25h** | |

**Deliverable**: User wybiera problem, wchodzi w sesję z whiteboardem i pustym panelem chatu. Timer tyka.

### Sprint 3 — Chat + WebSocket (Tydzień 5)

| Zadanie | Estymacja | Opis |
|---|---|---|
| WebSocket connection manager (client) | 4h | Connect, reconnect, heartbeat, message queue |
| WebSocket handler (server) | 4h | Auth, session binding, message routing |
| Chat UI (message list, input, streaming) | 4h | shadcn/ui based, markdown rendering |
| Claude integration (Anthropic SDK) | 2h | Wrapper with streaming, error handling |
| Chat turn handler (server) | 4h | Build context, call Claude, stream response |
| Conversation history management | 3h | Save to DB, load on reconnect, context window mgmt |
| System prompt builder | 3h | Dynamic prompt z problem + phase + diagram |
| Phase detection + transitions | 3h | Auto-detect phase from time + conversation content |
| **Sprint 3 Total** | **~27h** | |

**Deliverable**: User może chatować z AI interviewerem. AI widzi problem statement, odpowiada na clarifying questions. Streaming działa.

### Sprint 4 — Diagram Observation (Tydzień 6-7)

| Zadanie | Estymacja | Opis |
|---|---|---|
| Diagram change debouncer (client) | 2h | 2s idle → send update |
| Diagram update WS handler (server) | 2h | Receive graph, store snapshot |
| Change differ | 3h | Previous vs current graph diff |
| Static analyzer (rule-based) | 4h | SPOF, missing cache, no LB, all-sync, disconnected |
| AI observation engine | 6h | Full Observer from §6.2 |
| Interjection controller (cooldown, queue) | 3h | Cooldown logic, priority queue |
| Interjection UI (toast / subtle message) | 2h | Non-intrusive notification in chat panel |
| Diagram context in chat prompts | 3h | Every chat turn includes current diagram |
| 3 more problems (Parking Lot, Notification, Search) | 6h | Expand problem bank |
| Integration testing (full session flow) | 4h | Playwright E2E: start session → chat → draw → AI responds |
| **Sprint 4 Total** | **~35h** | |

**Deliverable**: AI obserwuje diagram w real-time. Gdy user dodaje komponenty, AI reaguje pytaniami. Cały interview flow działa end-to-end.

### Sprint 5 — Evaluation (Tydzień 8)

| Zadanie | Estymacja | Opis |
|---|---|---|
| End session flow (UI + WS) | 3h | End button, confirmation, disable editing |
| Evaluation job (background) | 4h | Collect all data, call Claude Opus |
| Evaluation prompt builder | 4h | Full prompt z §6.3 |
| Evaluation progress WebSocket updates | 2h | "Analyzing...", "Evaluating...", "Generating..." |
| Evaluation results page | 6h | Score display, dimension breakdown, radar chart |
| Evaluation PDF export | 4h | Diagram screenshot + transcript + scores → PDF |
| Evaluation persistence | 2h | Save to DB, link from session history |
| **Sprint 5 Total** | **~25h** | |

**Deliverable**: Po zakończeniu sesji, AI generuje szczegółową ewaluację. User widzi wynik z rozbiciem na wymiary.

### Sprint 6 — Dashboard, History, Polish (Tydzień 9)

| Zadanie | Estymacja | Opis |
|---|---|---|
| Session history page | 3h | Lista sesji z wynikami, filtrowanie |
| Stats dashboard | 4h | Średni wynik, trend, mocne/słabe strony |
| Problem page improvements | 2h | Difficulty badge, company tags, estimated time |
| Session replay (read-only) | 4h | Przeglądanie starej sesji: diagram + chat, krok po kroku |
| 4 remaining problems (total 10) | 6h | Rate Limiter, CDN, Payments, Video Streaming |
| Responsive layout fixes | 3h | Mobile: stacked layout, tablet: side-by-side |
| Error handling + edge cases | 3h | WS disconnect, API errors, timeout, empty states |
| Loading states + skeletons | 2h | Skeleton UI dla każdej strony |
| **Sprint 6 Total** | **~27h** | |

**Deliverable**: Kompletny produkt z historią, statystykami i 10 problemami. Gotowy do beta testów.

### Sprint 7 — Hardening & Deploy Prep (Tydzień 10)

| Zadanie | Estymacja | Opis |
|---|---|---|
| Production Dockerfile (WS server) | 2h | Multi-stage build, health checks |
| Vercel deployment config | 1h | Environment vars, build settings |
| Fly.io deployment config | 2h | fly.toml, secrets, scaling |
| Neon / Supabase migration | 2h | Migrate schema to production DB |
| Upstash Redis setup | 1h | Create instance, update connection |
| R2 / S3 storage adapter | 3h | Implement StorageService for cloud |
| Rate limiting (per-user) | 2h | Redis-backed: sessions/day, AI calls/min |
| Sentry integration (frontend + backend) | 2h | Error tracking, source maps |
| PostHog analytics | 2h | Session started, session completed, eval viewed |
| Security audit | 3h | Auth flows, WS auth, input sanitization, CORS |
| Landing page | 4h | One-page marketing site z demo GIF |
| **Sprint 7 Total** | **~24h** | |

**Deliverable**: Aplikacja gotowa do deploy na produkcję. Jeden `git push` deplouje frontend, `fly deploy` deplouje backend.

---

## 10. Podsumowanie Estymacji

| Sprint | Tydzień | Godziny | Focus |
|---|---|---|---|
| 0 — Fundament | 1 | 17h | Setup, auth, CI |
| 1 — Whiteboard | 2-3 | 37h | Custom shapes, graph extraction |
| 2 — Problems & Session | 4 | 25h | Problem bank, session flow |
| 3 — Chat + WebSocket | 5 | 27h | AI chat, streaming, prompts |
| 4 — Diagram Observation | 6-7 | 35h | Observer, static analysis, interjections |
| 5 — Evaluation | 8 | 25h | End session, scoring, PDF |
| 6 — Dashboard & Polish | 9 | 27h | History, stats, error handling |
| 7 — Production Ready | 10 | 24h | Deploy, monitoring, landing page |
| **Total** | **10 tygodni** | **~217h** | |

### Realność

- **1 osoba full-time (8h/dzień)**: ~5.5 tygodni czystego kodowania → z testami, bugfixami i przerwami → **10 tygodni** realistyczne
- **1 osoba part-time (wieczory, ~3h/dzień)**: ~15 tygodni → **4 miesiące**
- **2 osoby full-time**: ~6 tygodni (z overhead na komunikację)

---

## 11. Problem Bank — Format i Przykład

### YAML Format

```yaml
# problems/url-shortener.yaml

id: url-shortener
title: "Design a URL Shortener"
difficulty: mid
category: [storage, distributed-systems, web]
companies: [google, meta, amazon, twitter]
timeLimit: 45

statement: |
  Design a URL shortening service like bit.ly or tinyurl.com.
  The service should:
  - Accept a long URL and return a short URL
  - Redirect users from the short URL to the original URL
  - Handle high traffic efficiently
  - Track basic analytics (click count)

clarifications:
  - question: "How many URLs do we need to handle?"
    answer: "Assume 100M new URLs per month, with a 10:1 read-to-write ratio (1B redirects/month)."
    keywords: [scale, traffic, urls, how many, volume]

  - question: "How long should short URLs be?"
    answer: "As short as possible, but that's a design decision for you to make. Think about the trade-offs."
    keywords: [length, characters, short, how long]

  - question: "Do short URLs expire?"
    answer: "Let's say by default they don't expire, but users can set a custom expiration."
    keywords: [expire, expiration, ttl, delete, lifetime]

  - question: "Do we need user accounts?"
    answer: "For MVP, no authentication needed. Anyone can create a short URL. Analytics are public."
    keywords: [auth, login, user, account]

  - question: "What characters are allowed in short URLs?"
    answer: "That's your design decision. Consider what's URL-safe and easy to type."
    keywords: [characters, encoding, base, alphabet]

evaluationGuide:
  expectedComponents:
    - "API Gateway / Load Balancer"
    - "URL Shortening Service"
    - "Database for URL mappings (key-value or relational)"
    - "Cache layer (Redis/Memcached) for hot URLs"
    - "Analytics service or counter"
    - "Base62/Base58 encoding or hash-based ID generation"

  scalingConcerns:
    - "Read-heavy workload (10:1) — caching is critical"
    - "Key generation at scale — hash collisions, counter-based vs random"
    - "Database sharding strategy for URL mappings"
    - "Hot URLs (viral links) causing cache pressure"
    - "Redirect latency — should be <100ms"

  commonMistakes:
    - "Using auto-increment IDs (predictable, security concern)"
    - "No caching layer despite 10:1 read ratio"
    - "Single database without considering sharding"
    - "Not addressing hash collision handling"
    - "Ignoring analytics as a separate concern (coupling writes)"

  deepDiveTopics:
    - "Key generation: Base62 encoding vs MD5/SHA hash truncation"
    - "Cache eviction strategy for URL redirects"
    - "Database choice: SQL vs NoSQL for this access pattern"
    - "Analytics pipeline: sync vs async counting"
    - "Custom short URL handling (vanity URLs)"

  followUpConstraints:
    - "Now a URL goes viral and gets 1M clicks/sec. How does your design handle it?"
    - "The client wants real-time analytics (clicks per minute). How would you add that?"
    - "We need to add rate limiting. Where in the architecture does it go?"

  exampleGoodQuestions:
    - "What's our target latency for redirects?"
    - "Do we need to support custom short URLs (vanity URLs)?"
    - "What's the geographic distribution of users?"
    - "Do we need to handle malicious URLs?"
```

---

## 12. Komendy Developerskie

```bash
# ── Codzienne ──────────────────────────────
pnpm dev                    # Start all: next dev + ws-server + docker
pnpm dev:web                # Only frontend
pnpm dev:ws                 # Only WS server

# ── Database ───────────────────────────────
pnpm db:migrate             # Run pending migrations
pnpm db:generate            # Generate migration from schema changes
pnpm db:seed                # Seed problem bank
pnpm db:studio              # Open Drizzle Studio (DB browser)
pnpm db:reset               # Drop + recreate + migrate + seed

# ── Code Quality ───────────────────────────
pnpm lint                   # ESLint across all packages
pnpm typecheck              # TypeScript --noEmit across all
pnpm test                   # Vitest unit tests
pnpm test:e2e               # Playwright E2E tests

# ── Build & Deploy ─────────────────────────
pnpm build                  # Build all packages
pnpm deploy:web             # Deploy frontend to Vercel
pnpm deploy:ws              # Deploy WS server to Fly.io
```

---

## 13. Dependency List (package.json)

### Root

```json
{
  "devDependencies": {
    "turbo": "^2.3",
    "typescript": "^5.7"
  }
}
```

### apps/web

```json
{
  "dependencies": {
    "next": "^15.2",
    "react": "^19.0",
    "react-dom": "^19.0",
    "tldraw": "^3.8",
    "@clerk/nextjs": "^6.12",
    "zustand": "^5.0",
    "@radix-ui/react-dialog": "^1.1",
    "@radix-ui/react-dropdown-menu": "^2.1",
    "class-variance-authority": "^0.7",
    "clsx": "^2.1",
    "tailwind-merge": "^2.6",
    "react-markdown": "^9.0",
    "lucide-react": "^0.475"
  },
  "devDependencies": {
    "tailwindcss": "^4.0",
    "@types/react": "^19.0",
    "vitest": "^3.0",
    "@playwright/test": "^1.50"
  }
}
```

### apps/ws-server

```json
{
  "dependencies": {
    "hono": "^4.7",
    "@hono/node-ws": "^1.1",
    "@anthropic-ai/sdk": "^0.39",
    "drizzle-orm": "^0.38",
    "postgres": "^3.4",
    "ioredis": "^5.4",
    "zod": "^3.24",
    "nanoid": "^5.0",
    "pino": "^9.6"
  },
  "devDependencies": {
    "tsx": "^4.19",
    "drizzle-kit": "^0.30",
    "vitest": "^3.0"
  }
}
```

### packages/db

```json
{
  "dependencies": {
    "drizzle-orm": "^0.38",
    "postgres": "^3.4",
    "js-yaml": "^4.1"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30",
    "@types/js-yaml": "^4.0"
  }
}
```

---

## 14. Kluczowe Ryzyka i Mitygacje

| # | Ryzyko | Prawdopodobieństwo | Impact | Mitygacja |
|---|---|---|---|---|
| 1 | tldraw custom shapes są trudniejsze niż się wydaje | Wysokie | Wysoki | **Sprint 1 zaczyna się od PoC jednego shape'a.** Jeśli po 2 dniach nie działa — pivot na Excalidraw lub React Flow + custom rendering. Decyzja musi zapaść w dniu 3. |
| 2 | AI odpowiedzi są za wolne (>3s first token) | Średnie | Wysoki | Użyj Sonnet (nie Opus) na real-time. Pre-buduj context poza hot path. Cache system prompt. Streaming od pierwszego tokenu. |
| 3 | Graph extraction z tldraw nie łapie wszystkich edge cases | Wysokie | Średni | Extensive unit testy. Fallback: jeśli extraction zwróci pusty graph, AI opiera się tylko na conversation context. |
| 4 | AI interjections są irytujące lub za częste | Średnie | Wysoki | Cooldown 90s, priority queue, user slider "interviewer activity". Domyślnie: raczej mniej niż więcej. |
| 5 | WebSocket disconnect traci session state | Średnie | Średni | Cały state w Redis + DB. Reconnect protocol z message replay. Frontend trzyma local copy diagram + chat. |
| 6 | Koszt Claude API w dev/testach | Niskie | Niski | Mock AI service w testach. Dev mode z tańszym modelem (Haiku). Budget alertów na Anthropic console. |
| 7 | 10 tygodni to za mało | Średnie | Wysoki | Scope jest agresywny ale cut-able. Jeśli opóźnienie: wyrzuć PDF export, session replay, stats dashboard. Core = whiteboard + chat + observation + basic eval. |

---

## 15. Definition of Done — MVP Launch Checklist

- [ ] User może się zarejestrować (email + Google)
- [ ] Dashboard z listą 10 problemów, filtrowanie po difficulty
- [ ] Start sesji: whiteboard + chat side-by-side
- [ ] Whiteboard: 9 custom shapes + labeled arrows
- [ ] DiagramGraph extraction działa poprawnie
- [ ] Chat: streaming odpowiedzi z AI
- [ ] AI widzi diagram i reaguje na zmiany (interjections)
- [ ] AI dostosowuje się do fazy sesji (clarification → deep-dive → wrap-up)
- [ ] Timer sesji z alertem "5 minutes remaining"
- [ ] End session → evaluation z wynikiem 1-4 i rozbiciem na wymiary
- [ ] Historia sesji z wynikami
- [ ] Działa lokalnie (`docker compose up` + `pnpm dev`)
- [ ] Gotowe do deploy: Vercel + Fly.io + Neon + Upstash
- [ ] Sentry error tracking
- [ ] Landing page z opisem produktu
- [ ] README z instrukcją setup
