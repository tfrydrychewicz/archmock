# ArchMock — AI System Design Interview Platform

## System Design Document

---

## 1. Product Overview

ArchMock is a web application that simulates realistic system design interviews powered by AI. Users practice designing distributed systems on an interactive whiteboard while an AI interviewer — available via chat or voice — observes their work in real-time, asks probing questions, steers them away from mistakes, and delivers a structured evaluation at the end.

### 1.1 Core User Flows

```
1. User starts a session → AI generates (or user picks) a SD problem
2. User reads the problem statement, asks clarifying questions via chat/voice
3. User designs on the whiteboard: draws components, arrows, labels, writes notes
4. AI observes the canvas in real-time (periodic snapshots + structured graph)
5. AI interjects: asks questions, challenges assumptions, hints at missed concerns
6. User iterates on the design based on AI feedback
7. Session ends → AI produces a structured evaluation rubric with score
```

### 1.2 Key Differentiators

- **Real diagramming, not toy sketches** — full-featured canvas with typed nodes (service, DB, queue, LB, cache, CDN, etc.), labeled edges, and grouping/zones.
- **AI sees the diagram structurally** — not just screenshots, but a parsed graph representation that enables precise feedback ("Your UserService talks directly to the DB without a cache layer — at 10M DAU, what latency would you expect?").
- **Dual-mode interaction** — seamless switch between text chat and voice conversation mid-session.
- **Interviewer persona, not tutor** — the AI behaves like a real interviewer: it doesn't lecture, it asks Socratic questions.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                             │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────┐ │
│  │  Whiteboard   │  │  Chat Panel  │  │   Voice Agent Controls    │ │
│  │  (Canvas)     │  │              │  │   (mic / speaker)         │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────────┘ │
│         │                 │                       │                 │
│  ┌──────┴─────────────────┴───────────────────────┴──────────────┐ │
│  │              Session State Manager (Zustand)                   │ │
│  │   - diagram graph model    - chat history                      │ │
│  │   - session metadata       - evaluation state                  │ │
│  └──────────────────────────┬────────────────────────────────────┘ │
│                             │ WebSocket + REST                     │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     API GATEWAY / EDGE                              │
│                  (Cloudflare / Vercel Edge)                         │
│            Auth · Rate Limiting · WS Upgrade                       │
└─────────────┬────────────────────────┬──────────────────────────────┘
              │                        │
      ┌───────▼──────────┐    ┌────────▼──────────┐
      │  Session Service  │    │  Voice Pipeline   │
      │  (REST + WS)      │    │  (WebRTC / WS)    │
      │                   │    │                    │
      │  - problem gen    │    │  - STT (Deepgram)  │
      │  - chat turns     │    │  - LLM (Claude)    │
      │  - diagram eval   │    │  - TTS (ElevenLabs │
      │  - final scoring  │    │       or Cartesia) │
      └───────┬───────────┘    └────────┬───────────┘
              │                         │
      ┌───────▼─────────────────────────▼───────────┐
      │             AI Orchestration Layer           │
      │                                              │
      │  ┌────────────────┐  ┌────────────────────┐ │
      │  │ Diagram Analyst │  │ Interviewer Agent  │ │
      │  │ (vision + graph)│  │ (conversational)   │ │
      │  └────────────────┘  └────────────────────┘ │
      │                                              │
      │  Claude API (Sonnet for real-time,           │
      │              Opus for final eval)            │
      └───────┬──────────────────────────────────────┘
              │
      ┌───────▼───────────────────────────────────────┐
      │              Data Layer                        │
      │                                                │
      │  PostgreSQL        Redis          S3 / R2      │
      │  - users           - session      - diagram    │
      │  - sessions          state          snapshots  │
      │  - evaluations     - rate limits  - audio logs │
      │  - problem bank    - WS state     - exports    │
      └────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

### 3.1 Frontend

| Layer | Technology | Rationale |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | SSR for landing/marketing, RSC for dashboard, client components for the session |
| Language | **TypeScript** | Non-negotiable for a project this complex |
| State | **Zustand** | Lightweight, works well outside React tree (canvas needs it) |
| Whiteboard Engine | **tldraw** (embedded, customized) | Best open-source infinite canvas. MIT licensed. Extensible shape system — we define custom SD shapes. Built-in collaboration protocol we can leverage later. Alternative: **Excalidraw** (simpler but less extensible) |
| Chat UI | Custom, built on **shadcn/ui** components | Markdown rendering, code blocks, streaming tokens |
| Voice | **Web Audio API + WebSocket** | Raw PCM streaming to backend; playback of TTS audio chunks |
| Styling | **Tailwind CSS v4** | Utility-first, design system via CSS variables |
| Auth | **Clerk** or **NextAuth.js v5** | Social + email login, JWT sessions |

### 3.2 Backend

| Layer | Technology | Rationale |
|---|---|---|
| Runtime | **Node.js 22 (LTS)** with **Hono** framework | Fast, lightweight, first-class WebSocket support, runs on edge and Node |
| API Style | REST for CRUD, **WebSocket** for real-time session communication | Chat streaming + diagram observation need persistent connections |
| Database | **PostgreSQL 16** (via **Neon** or **Supabase**) | Relational data: users, sessions, evaluations, problem bank |
| ORM | **Drizzle ORM** | Type-safe, lightweight, excellent DX |
| Cache / Pub-Sub | **Redis** (Upstash) | Session state, rate limiting, WS fan-out for future multi-user |
| Object Storage | **Cloudflare R2** or **AWS S3** | Diagram snapshots (PNG), audio recordings, PDF exports |
| Background Jobs | **Inngest** or **BullMQ** | Final evaluation generation, audio transcription, export generation |

### 3.3 AI Stack

| Capability | Service | Details |
|---|---|---|
| Conversational LLM | **Anthropic Claude API** | Sonnet 4 for real-time chat/observation (fast, cheap). Opus 4 for final evaluation (thorough, expensive). |
| Diagram Understanding | **Claude Vision** (multimodal) + **structured graph** | Dual approach: send both a PNG snapshot AND a JSON graph representation. The structured graph enables precise references; the image provides spatial/visual context. |
| Speech-to-Text | **Deepgram Nova-3** | Real-time streaming STT, <300ms latency, excellent accuracy |
| Text-to-Speech | **Cartesia Sonic** or **ElevenLabs** | Low-latency streaming TTS. Cartesia is faster; ElevenLabs has better voice quality. |
| Voice Orchestration | Custom **voice pipeline** (see §6) | Manages turn-taking, interruption handling, VAD (voice activity detection) |

### 3.4 Infrastructure

| Concern | Solution |
|---|---|
| Hosting | **Vercel** (Next.js frontend) + **Fly.io** or **Railway** (WebSocket backend — Vercel doesn't support long-lived WS well) |
| CDN | **Cloudflare** |
| Monitoring | **Sentry** (errors), **Axiom** or **Betterstack** (logs), **PostHog** (product analytics) |
| CI/CD | **GitHub Actions** |
| IaC | **Pulumi** (TypeScript) or **SST** (if staying in AWS/Vercel ecosystem) |

---

## 4. Whiteboard & Diagram System (Deep Dive)

This is the heart of the product. The whiteboard must feel like a real tool, not a toy — but it's also a structured data source for the AI.

### 4.1 Custom Shape System (tldraw)

tldraw allows defining custom shapes with their own rendering, properties, and behavior. We define a system design shape vocabulary:

```typescript
// Shape types for system design
type SDShapeType =
  | 'sd-service'        // Microservice / API
  | 'sd-database'       // SQL, NoSQL, Graph DB
  | 'sd-cache'          // Redis, Memcached
  | 'sd-queue'          // Kafka, RabbitMQ, SQS
  | 'sd-load-balancer'  // LB / API Gateway
  | 'sd-cdn'            // CDN node
  | 'sd-client'         // Browser, Mobile, IoT
  | 'sd-storage'        // Blob/Object storage
  | 'sd-zone'           // Grouping: VPC, Region, AZ
  | 'sd-text'           // Free-form annotation
  | 'sd-arrow'          // Labeled connection (protocol, sync/async)

interface SDShapeProps {
  label: string
  subLabel?: string              // e.g., "PostgreSQL", "Kafka", "L7"
  techChoice?: string            // specific technology
  annotations?: string[]         // user notes
  metrics?: {                    // optional capacity annotations
    rps?: string
    latency?: string
    storage?: string
  }
}

interface SDArrowProps {
  label?: string                 // e.g., "REST", "gRPC", "async"
  protocol?: 'http' | 'grpc' | 'websocket' | 'async' | 'tcp'
  isAsync?: boolean
  dataFlow?: string              // e.g., "user events", "notifications"
}
```

### 4.2 Diagram → Graph Model (for AI consumption)

Every change on the canvas produces a **structured graph** that the AI can reason about precisely:

```typescript
interface DiagramGraph {
  nodes: {
    id: string
    type: SDShapeType
    label: string
    techChoice?: string
    position: { x: number, y: number }  // spatial context
    zone?: string                        // parent zone ID
    metrics?: Record<string, string>
  }[]
  edges: {
    id: string
    from: string                         // node ID
    to: string                           // node ID
    label?: string
    protocol?: string
    isAsync?: boolean
  }[]
  zones: {
    id: string
    label: string                        // e.g., "us-east-1", "VPC"
    childNodeIds: string[]
  }[]
}
```

This graph is serialized and sent to the AI alongside (optionally) a rasterized PNG snapshot. The graph enables queries like "which nodes have no redundancy?" or "is there a single point of failure between Client and Database?" without needing vision at all.

### 4.3 Change Detection & AI Notification

We don't send every mouse move to the AI. Instead:

```
Canvas Change → Debounce (2s idle) → Diff against last snapshot
       │
       ▼
  Significant change?
  (new node, new edge, deleted component, label change)
       │
   Yes ▼                    No → skip
  Serialize DiagramGraph
  + optional PNG rasterize
       │
       ▼
  Send to AI Orchestrator via WebSocket
       │
       ▼
  AI decides: respond now, or wait for more changes
```

The debounce + significance filter prevents flooding the AI with noise while a user is actively dragging shapes around. The AI also has its own "patience" parameter — it may accumulate 2-3 changes before commenting, to avoid being annoying.

---

## 5. AI Interviewer Agent (Deep Dive)

### 5.1 Agent Architecture

The interviewer is a **stateful conversational agent** with access to:

1. **Problem context** — the full problem statement, expected solution areas, evaluation rubric
2. **Diagram state** — the current `DiagramGraph` + history of changes
3. **Conversation history** — all chat/voice exchanges
4. **Session clock** — time elapsed, time remaining (interviews are typically 45-60 min)
5. **Evaluation rubric** — what the AI should be assessing (see §7)

```typescript
interface InterviewerContext {
  problem: {
    title: string
    statement: string
    clarifications: Record<string, string>  // pre-loaded Q&A
    expectedComponents: string[]             // what a good solution includes
    evaluationDimensions: EvalDimension[]
    difficulty: 'junior' | 'mid' | 'senior' | 'staff'
  }
  diagram: {
    current: DiagramGraph
    history: DiagramSnapshot[]              // timestamped snapshots
    changeSummary: string                   // AI-generated diff description
  }
  conversation: ChatMessage[]
  session: {
    startedAt: Date
    duration: number                        // target minutes
    phase: 'clarification' | 'high-level' | 'deep-dive' | 'wrap-up'
  }
}
```

### 5.2 Behavioral Prompt Engineering

The system prompt is carefully designed so the AI behaves like a real interviewer, not a tutor:

```
You are a system design interviewer at a top tech company. Your role is to
evaluate the candidate's ability to design scalable systems.

BEHAVIORAL RULES:
1. NEVER give the answer. Ask questions that lead the candidate to discover it.
2. When you see a mistake, don't say "that's wrong." Ask a question that
   exposes the issue: "What happens to your single DB when traffic hits 100K RPS?"
3. Follow the interview phases:
   - CLARIFICATION (0-5 min): Let them ask questions. Answer from the problem spec.
   - HIGH-LEVEL (5-20 min): Expect a rough architecture. If they dive too deep
     too early, steer them back: "Before we go into the DB schema, can you walk
     me through the end-to-end flow?"
   - DEEP-DIVE (20-40 min): Push on 1-2 areas. Ask about scaling, failure modes,
     trade-offs.
   - WRAP-UP (40-45 min): Ask them to summarize trade-offs. Prompt for anything
     they'd change given more time.
4. Adjust difficulty to the candidate's level. If they're struggling, simplify.
   If they're breezing through, introduce constraints.
5. React to diagram changes. When you see a new component appear, ask about it.
   When you see a missing component, ask a question that hints at it.
6. Be conversational and warm, but professional.
```

### 5.3 Observation Engine

The AI doesn't just passively receive diagram updates — it runs an **analysis pipeline** on every significant change:

```
DiagramGraph received
       │
       ▼
  ┌─────────────────────────────────────┐
  │  Static Analysis (rule-based, fast) │
  │                                     │
  │  - Single points of failure         │
  │  - Missing components for problem   │
  │  - Disconnected nodes               │
  │  - No caching layer with high-read  │
  │  - Synchronous chains > 3 hops      │
  │  - No async processing for writes   │
  │  - Missing rate limiting at edge    │
  └──────────────┬──────────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────────┐
  │  LLM Analysis (Claude Sonnet)       │
  │                                     │
  │  Input: graph JSON + change diff +  │
  │         problem context + convo     │
  │                                     │
  │  Output (structured):               │
  │  {                                  │
  │    shouldInterject: boolean,        │
  │    priority: 'low' | 'medium' |     │
  │                'high' | 'critical', │
  │    observation: string,             │
  │    suggestedQuestion: string,       │
  │    category: 'scaling' | 'failure'  │
  │              | 'trade-off' | ...    │
  │  }                                  │
  └──────────────┬──────────────────────┘
                 │
                 ▼
  Interjection Controller
  - Respects cooldown (don't interrupt every 10s)
  - Queues low-priority observations
  - Fires immediately on critical issues
  - Considers session phase
```

### 5.4 Interjection Cadence

To feel natural, the AI follows an interjection policy:

- **Minimum gap**: 90 seconds between unprompted comments (unless critical)
- **Maximum silence**: If the user hasn't interacted for 3+ minutes, the AI may prompt: "I see you're thinking about the storage layer — would it help to talk through the access patterns?"
- **Phase-appropriate**: During clarification phase, the AI is mostly reactive. During deep-dive, it's more proactive.
- **User preference**: A slider in the UI: "Interviewer activity" from Passive ↔ Active

---

## 6. Voice Agent Pipeline (Deep Dive)

### 6.1 Architecture

The voice pipeline is a full-duplex audio system:

```
┌──────────┐         ┌──────────────────────────────────────┐
│  Browser  │◄──WS──►│         Voice Gateway (Fly.io)       │
│  Mic/Spk  │  PCM   │                                      │
└──────────┘  chunks │  ┌─────────┐  ┌────────┐  ┌───────┐ │
                      │  │   VAD   │→ │  STT   │→ │  LLM  │ │
                      │  │ (Silero)│  │Deepgram│  │Claude │ │
                      │  └─────────┘  └────────┘  └───┬───┘ │
                      │                                │     │
                      │  ┌─────────────────────────────▼───┐ │
                      │  │  TTS (Cartesia / ElevenLabs)    │ │
                      │  │  → streams audio chunks back    │ │
                      │  └─────────────────────────────────┘ │
                      └──────────────────────────────────────┘
```

### 6.2 Turn-Taking & Interruption

Real conversations have interruptions. The pipeline handles this:

1. **VAD (Voice Activity Detection)**: Silero VAD runs on the server to detect when the user starts/stops speaking.
2. **Endpointing**: After detecting silence for 700ms, the system considers the turn complete and sends the transcript to the LLM.
3. **Barge-in**: If the user starts speaking while TTS is playing, immediately:
   - Stop TTS playback
   - Cancel any pending LLM generation
   - Buffer the new user speech
   - Process as a new turn

### 6.3 Latency Budget

Target: **< 1.2 seconds** from user finishing speech to AI starting to speak.

| Stage | Budget | Approach |
|---|---|---|
| Endpointing (silence detection) | 300-700ms | Silero VAD, tunable threshold |
| STT finalization | 100-200ms | Deepgram streaming (interim results ready) |
| LLM first token | 300-500ms | Claude Sonnet streaming, short system prompt variant |
| TTS first audio chunk | 100-200ms | Cartesia streaming (starts on partial LLM output) |
| **Total** | **~800-1600ms** | |

### 6.4 Voice ↔ Chat Sync

When in voice mode, the conversation is still logged as text in the chat panel (like subtitles). The user can switch between voice and chat at any time without losing context — they share the same conversation history and session state.

---

## 7. Evaluation System

### 7.1 Evaluation Rubric

At the end of a session, the AI generates a structured evaluation. The rubric is based on industry-standard SD interview criteria:

```typescript
interface Evaluation {
  overall: {
    score: number            // 1-4 scale: 1=No Hire, 2=Lean No, 3=Lean Yes, 4=Strong Yes
    summary: string          // 2-3 sentence overall assessment
  }
  dimensions: {
    requirementsGathering: DimensionScore   // Did they ask good clarifying questions?
    highLevelDesign: DimensionScore         // Is the overall architecture sound?
    componentDesign: DimensionScore         // Are individual components well-designed?
    scalability: DimensionScore             // Does it handle the stated scale?
    tradeoffs: DimensionScore               // Did they articulate trade-offs?
    communication: DimensionScore           // How well did they explain their thinking?
    technicalDepth: DimensionScore          // Deep knowledge in specific areas?
  }
  strengths: string[]
  areasForImprovement: string[]
  detailedFeedback: {
    diagramFeedback: string                 // Specific comments on the final diagram
    missedConsiderations: string[]          // Things they didn't address
    suggestedReadings: string[]             // Resources for improvement
  }
}

interface DimensionScore {
  score: number          // 1-4
  rationale: string      // Why this score
  examples: string[]     // Specific moments from the session
}
```

### 7.2 Evaluation Generation

The final evaluation uses **Claude Opus** (the most thorough model) with the full context:

- Complete conversation transcript
- Final diagram graph + all historical snapshots
- Problem statement + expected solution areas
- All AI observations throughout the session

This is run as a background job (Inngest) since it may take 15-30 seconds and the user sees a "generating evaluation" loading state.

---

## 8. Problem Bank

### 8.1 Problem Structure

```typescript
interface SDProblem {
  id: string
  title: string                          // "Design a URL Shortener"
  difficulty: 'junior' | 'mid' | 'senior' | 'staff'
  category: string[]                     // ["storage", "distributed-systems"]
  companies: string[]                    // Where this is commonly asked
  timeLimit: number                      // minutes

  statement: string                      // The initial problem as presented to the user
  clarifications: {
    question: string
    answer: string
  }[]                                    // Pre-loaded answers to common clarifying questions

  evaluationGuide: {
    expectedComponents: string[]         // What a good solution should include
    scalingConcerns: string[]            // What scaling issues to probe
    commonMistakes: string[]             // What to watch for
    deepDiveTopics: string[]             // Good areas to go deep on
    followUpConstraints: string[]        // Extra constraints to add if user is doing well
  }

  referenceDesign?: DiagramGraph         // An example good solution (for AI reference only)
}
```

### 8.2 Problem Sources

1. **Curated bank** — 50-100 hand-crafted problems with detailed evaluation guides (launch set)
2. **AI-generated** — Claude generates new problems based on a meta-template; a human reviews before publishing
3. **Community-contributed** — Users can submit problems (moderated pipeline, future feature)

---

## 9. Data Model

```sql
-- Users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  avatar_url    TEXT,
  plan          TEXT DEFAULT 'free',  -- free | pro | team
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Interview Sessions
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  problem_id    TEXT NOT NULL,
  status        TEXT DEFAULT 'active',  -- active | completed | abandoned
  mode          TEXT DEFAULT 'chat',    -- chat | voice | hybrid
  difficulty    TEXT,
  started_at    TIMESTAMPTZ DEFAULT now(),
  ended_at      TIMESTAMPTZ,
  duration_sec  INTEGER
);

-- Chat Messages (both user and AI)
CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID REFERENCES sessions(id),
  role          TEXT NOT NULL,           -- user | assistant | system
  content       TEXT NOT NULL,
  source        TEXT DEFAULT 'chat',     -- chat | voice_transcript | observation
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Diagram Snapshots (periodic + on significant changes)
CREATE TABLE diagram_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID REFERENCES sessions(id),
  graph_json    JSONB NOT NULL,          -- DiagramGraph
  png_url       TEXT,                    -- S3/R2 URL
  trigger       TEXT,                    -- 'change' | 'periodic' | 'final'
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- AI Observations (internal log, not shown to user during session)
CREATE TABLE observations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID REFERENCES sessions(id),
  category      TEXT,                    -- scaling, failure, trade-off, etc.
  priority      TEXT,
  observation   TEXT,
  action_taken  TEXT,                    -- 'interjected' | 'queued' | 'suppressed'
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Evaluations
CREATE TABLE evaluations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID REFERENCES sessions(id) UNIQUE,
  overall_score INTEGER,
  summary       TEXT,
  dimensions    JSONB,                   -- full dimension scores
  strengths     JSONB,
  improvements  JSONB,
  detailed      JSONB,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Problem Bank
CREATE TABLE problems (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  difficulty    TEXT NOT NULL,
  category      TEXT[] DEFAULT '{}',
  statement     TEXT NOT NULL,
  clarifications JSONB DEFAULT '[]',
  evaluation_guide JSONB NOT NULL,
  reference_design JSONB,
  is_published  BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

---

## 10. API Design

### 10.1 REST Endpoints

```
POST   /api/auth/login              → Login / register
POST   /api/auth/logout             → Logout

GET    /api/problems                → List problems (filtered by difficulty/category)
GET    /api/problems/:id            → Get problem details

POST   /api/sessions                → Start new session { problemId, mode }
GET    /api/sessions                → List user's sessions (history)
GET    /api/sessions/:id            → Get session details
PATCH  /api/sessions/:id            → Update session (end it, change mode)
GET    /api/sessions/:id/evaluation → Get evaluation results

GET    /api/user/stats              → User statistics (sessions, avg scores, trends)
```

### 10.2 WebSocket Protocol

All real-time communication runs over a single WebSocket per session:

```typescript
// Client → Server messages
type ClientMessage =
  | { type: 'chat.send', content: string }
  | { type: 'diagram.update', graph: DiagramGraph, png?: string }
  | { type: 'voice.audio', chunk: ArrayBuffer }       // PCM audio
  | { type: 'voice.start' }                            // user started speaking
  | { type: 'voice.stop' }                             // user stopped speaking
  | { type: 'session.end' }
  | { type: 'ping' }

// Server → Client messages
type ServerMessage =
  | { type: 'chat.stream', delta: string, messageId: string }
  | { type: 'chat.done', messageId: string }
  | { type: 'voice.audio', chunk: ArrayBuffer }        // TTS audio
  | { type: 'voice.transcript', text: string, role: 'user' | 'assistant' }
  | { type: 'voice.speaking_start' }                   // AI starts speaking
  | { type: 'voice.speaking_stop' }                    // AI stops speaking
  | { type: 'observation.hint', text: string }         // subtle AI observation (shown as a small toast, not a full message)
  | { type: 'session.phase_change', phase: string }
  | { type: 'session.evaluation_ready', evaluationId: string }
  | { type: 'error', code: string, message: string }
  | { type: 'pong' }
```

---

## 11. Diagram-AI Dual Representation Strategy

This is the key architectural insight of the system: the AI evaluates diagrams through **two complementary channels**, not just one.

### 11.1 Structured Graph (Primary)

The `DiagramGraph` JSON gives the AI precise, queryable information:
- Exact component types and their connections
- Which protocols are used
- Whether connections are sync or async
- Topology analysis (cycles, fan-out, single points of failure)

This enables feedback like: *"I see your write path goes Client → API → Database with no queue. What happens if the database is slow?"*

### 11.2 Visual Snapshot (Secondary)

A rasterized PNG of the canvas gives the AI:
- Spatial layout (how the user organizes their thinking)
- Free-form annotations and notes that aren't part of the structured graph
- Visual groupings and implied relationships
- Overall "completeness" — a sparse diagram with 3 boxes vs. a rich one

We send the PNG to Claude's vision capability alongside the JSON graph. The system prompt instructs the AI to use the graph for precise analysis and the image for holistic assessment.

### 11.3 When to Use Each

| AI Task | Primary Input | Secondary Input |
|---|---|---|
| Detect missing component | Graph (check expected vs actual nodes) | — |
| Identify SPOF | Graph (connectivity analysis) | — |
| Assess overall completeness | Graph (node/edge count) | Image (visual density) |
| Read user annotations | — | Image (OCR via vision) |
| Comment on spatial organization | — | Image (layout quality) |
| Generate specific feedback | Graph (reference exact components) | Image (point to areas) |

---

## 12. Scaling & Performance Considerations

### 12.1 AI Cost Management

AI API calls are the dominant cost. Strategies to control:

| Strategy | Implementation |
|---|---|
| **Tiered models** | Sonnet for real-time (cheap, fast). Opus only for final eval. |
| **Debounced observation** | Don't call AI on every canvas change — 2s debounce + significance filter |
| **Context window management** | Summarize old conversation turns; keep last 10 full, compress earlier ones |
| **Caching** | Cache problem clarification answers. Cache common observation patterns. |
| **Free tier limits** | 3 sessions/month free, limited to 30 min. Pro: unlimited, 60 min. |

### 12.2 Estimated Cost Per Session (45 min)

| Cost Center | Estimated |
|---|---|
| Claude Sonnet (chat/observation, ~50 calls × ~2K tokens avg) | ~$0.30 |
| Claude Opus (final evaluation, 1 call × ~8K tokens) | ~$0.40 |
| Deepgram STT (voice mode, ~30 min audio) | ~$0.25 |
| Cartesia/ElevenLabs TTS (voice mode, ~15 min generated) | ~$0.15-0.30 |
| Infrastructure (compute, DB, storage, amortized) | ~$0.05 |
| **Total (chat only)** | **~$0.75** |
| **Total (voice mode)** | **~$1.15** |

### 12.3 Scaling Strategy

**Phase 1 (0-1K users)**: Single server, vertical scaling. Fly.io machine with 4 vCPU, 8GB RAM. One PostgreSQL instance. Enough for ~50 concurrent sessions.

**Phase 2 (1K-10K users)**: Horizontal scaling. Multiple Fly.io machines behind load balancer. Redis for session state and WS coordination. Read replicas for PostgreSQL.

**Phase 3 (10K+ users)**: WebSocket connections via dedicated connection servers (sticky sessions via Redis). Separate worker pool for AI calls. CDN for static assets. Consider dedicated GPU instances for self-hosted STT if Deepgram costs are high.

---

## 13. Security

| Concern | Mitigation |
|---|---|
| Auth | JWT tokens with short expiry (15 min) + refresh tokens. HttpOnly cookies. |
| WebSocket auth | Token sent on WS upgrade, validated server-side. Re-auth on reconnect. |
| AI prompt injection | User input is always placed in a `<user_input>` block within system prompts. Content filtering on AI outputs. |
| Audio privacy | Audio streams are not stored by default. Users can opt-in to recording for self-review. Clear consent UX. |
| Data isolation | Row-level security on all queries. Users can only access their own sessions. |
| Rate limiting | Per-user limits on API calls, WS messages, and AI invocations. Redis-backed sliding window. |
| GDPR | Data export and deletion endpoints. Session data auto-deleted after 90 days for free users. |

---

## 14. MVP Scope & Phasing

### Phase 1 — MVP (8-10 weeks)

- User auth (email + Google)
- 10 curated SD problems
- Whiteboard with custom SD shapes (service, DB, cache, queue, LB, arrows)
- DiagramGraph extraction
- Chat-based AI interviewer (Claude Sonnet)
- Real-time diagram observation (graph-only, no vision yet)
- Basic evaluation (generated at session end)
- Session history

### Phase 2 — Voice & Polish (4-6 weeks)

- Voice agent (Deepgram + Cartesia + Claude)
- Vision-based diagram analysis (PNG snapshots)
- Enhanced evaluation rubric with dimension scores
- More problems (25+)
- User dashboard with progress tracking

### Phase 3 — Growth (4-6 weeks)

- Pro plan with billing (Stripe)
- Shareable evaluation links
- PDF export of session (diagram + transcript + evaluation)
- Community problem submissions
- Problem difficulty calibration based on user performance

### Phase 4 — Multiplayer (Future)

- Pair practice mode (two users, one AI interviewer)
- Mock panel interview (multiple AI interviewers)
- Company-specific problem tracks
- API for interview prep platforms to embed

---

## 15. Deployment Topology

```
                    ┌──────────────────┐
                    │   Cloudflare     │
                    │   CDN + WAF      │
                    └────────┬─────────┘
                             │
               ┌─────────────┼─────────────┐
               ▼                           ▼
    ┌──────────────────┐        ┌──────────────────┐
    │   Vercel          │        │   Fly.io          │
    │   (Next.js App)   │        │   (WS Backend)    │
    │                   │        │                   │
    │   - SSR pages     │        │   - WebSocket     │
    │   - API routes    │        │   - Voice pipeline│
    │     (REST)        │        │   - AI calls      │
    │   - Static assets │        │   - Session mgmt  │
    └──────────────────┘        └────────┬──────────┘
                                         │
                    ┌────────────────────┬┴───────────┐
                    ▼                    ▼             ▼
             ┌────────────┐     ┌──────────────┐  ┌──────┐
             │ PostgreSQL  │     │    Redis      │  │  R2  │
             │ (Neon)      │     │  (Upstash)    │  │  /S3 │
             └────────────┘     └──────────────┘  └──────┘
```

---

## 16. Key Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| AI "hallucinating" diagram content | High — wrong feedback destroys trust | Dual representation (graph is ground truth). AI is instructed to only reference what's in the graph JSON. |
| Voice latency > 2s | High — feels unnatural | Streaming at every stage. Cartesia's speed. Pre-warming TTS connection. Fallback to chat if latency degrades. |
| tldraw customization complexity | Medium — custom shapes may fight the framework | Build a PoC with 3 shapes before committing. Fallback: Excalidraw or fully custom canvas (React-Konva). |
| AI cost spiral | High — unprofitable at scale | Aggressive caching, debouncing, tiered models. Set hard per-session token budgets. |
| WebSocket reliability | Medium — reconnections, message ordering | Implement reconnect protocol with message replay. Redis-backed state survives server restart. |
| Diagram-to-graph accuracy | Medium — if the graph doesn't match the canvas, AI feedback is wrong | tldraw's data model IS the graph — we derive from it, not OCR. This is architecturally robust. |
