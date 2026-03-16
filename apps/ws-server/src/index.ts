import "./env";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { healthRoutes } from "./routes/health";
import { createWSHandlers } from "./ws/handler";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({ origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000" })
);

app.route("/", healthRoutes);

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.get(
  "/ws",
  upgradeWebSocket((c) => {
    const token = c.req.query("token") ?? null;
    const sessionId = c.req.query("sessionId") ?? null;
    const handlers = createWSHandlers(token, sessionId);
    return {
      onOpen: handlers.onOpen,
      onMessage: handlers.onMessage,
      onClose: handlers.onClose,
    };
  })
);

const port = Number(process.env.PORT) || 4000;

console.log(`🚀 WS server running on http://localhost:${port}`);

const server = serve({
  fetch: app.fetch,
  port,
});

injectWebSocket(server);
