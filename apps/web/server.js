const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const JWT_SECRET = process.env.JWT_SECRET || "myschool-dev-secret-change-in-production-32chars";

const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

// Helper to parse cookie string
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    if (parts.length >= 2) {
      list[parts[0].trim()] = decodeURIComponent(parts.slice(1).join("=").trim());
    }
  });
  return list;
}

// Helper to verify JWT token
function verifySocketToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

const startTime = Date.now();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("[server] Request handling error:", req.url, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  // Attach Socket.IO to HTTP server
  const io = new Server(httpServer, {
    path: "/api/socket/io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  // Store globally so Next.js API routes & server helpers can emit
  global.io = io;

  // Socket Authentication Middleware
  io.use((socket, nextMiddleware) => {
    try {
      let token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token;

      if (!token && socket.handshake.headers.cookie) {
        const cookies = parseCookies(socket.handshake.headers.cookie);
        token = cookies["myschool_token"];
      }

      if (!token && socket.handshake.headers.authorization) {
        const authHeader = socket.handshake.headers.authorization;
        if (authHeader.toLowerCase().startsWith("bearer ")) {
          token = authHeader.slice(7).trim();
        }
      }

      const decoded = verifySocketToken(token);
      if (!decoded || !decoded.userId) {
        return nextMiddleware(new Error("Authentication failed: Invalid or missing token"));
      }

      socket.data.user = decoded;
      socket.data.rawToken = token;
      return nextMiddleware();
    } catch (err) {
      return nextMiddleware(new Error("Authentication failed: " + err.message));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    if (!user || !user.userId) return;

    const userRoom = `user:${user.userId}`;
    const schoolRoom = `school:${user.schoolId}`;

    socket.join(userRoom);
    if (user.schoolId) {
      socket.join(schoolRoom);
    }

    // Helper to calculate and send unread badges for the user
    const triggerBadgeSync = async () => {
      try {
        if (typeof global.realtimeEmitBadgeUpdate === "function") {
          await global.realtimeEmitBadgeUpdate(user.userId);
        } else {
          // Fallback via internal API call if Next.js runtime module not initialized yet
          const token = socket.data.rawToken;
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          if (socket.handshake.headers.cookie) {
            headers["Cookie"] = socket.handshake.headers.cookie;
          }
          const res = await fetch(`http://127.0.0.1:${port}/api/badges`, { headers });
          if (res.ok) {
            const data = await res.json();
            socket.emit("badges:update", data);
          }
        }
      } catch (err) {
        // Silent fallback
      }
    };

    // 1. Send initial unread counts once upon connection
    triggerBadgeSync();

    // 2. Client asks for a single explicit sync (e.g. app reopened or reconnected)
    socket.on("sync:badges", () => {
      triggerBadgeSync();
    });

    // 3. Client notifies that a notification was read
    socket.on("notification:read", async (data) => {
      try {
        if (data && data.id && typeof global.realtimeMarkNotificationRead === "function") {
          await global.realtimeMarkNotificationRead(data.id, user.userId);
        }
      } catch (err) {
        console.warn("[socket] notification:read error:", err);
      }
    });

    // 4. Client marks all notifications read
    socket.on("notifications:read_all", async () => {
      try {
        if (typeof global.realtimeMarkAllNotificationsRead === "function") {
          await global.realtimeMarkAllNotificationsRead(user.userId);
        }
      } catch (err) {
        console.warn("[socket] notifications:read_all error:", err);
      }
    });

    socket.on("disconnect", () => {
      // Socket automatically leaves rooms
    });
  });

  httpServer.listen(port, "0.0.0.0", (err) => {
    if (err) throw err;
    const elapsed = Date.now() - startTime;
    console.log(`\n  ▲ Next.js 14.2.35 + Socket.IO Real-Time Server`);
    console.log(`  - Local:        http://localhost:${port}`);
    console.log(`  - Network:      http://0.0.0.0:${port}`);
    console.log(`  ✓ Ready in ${elapsed}ms\n`);
  });
});
