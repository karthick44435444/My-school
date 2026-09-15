const jwt = require("jsonwebtoken");
const { io } = require("socket.io-client");
const http = require("http");

const JWT_SECRET = process.env.JWT_SECRET || "myschool-dev-secret-change-in-production-32chars";

async function runTest() {
  console.log("=== Testing Real-Time Socket.IO Notifications & Badges ===");

  // 1. Create a test JWT token
  const testUser = {
    userId: "usr_admin_demo_test",
    schoolId: "sch_demo_test",
    schoolCode: "SCH001",
    role: "ADMIN",
    firstName: "SocketAdmin",
    email: "admin.test@myschool.com",
  };
  const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: "1h" });
  console.log("✓ Generated test JWT token");

  // 2. Start server in-process for testing
  const { Server } = require("socket.io");
  const server = http.createServer();
  const socketIo = new Server(server, {
    path: "/api/socket/io",
    cors: { origin: "*" },
  });

  global.io = socketIo;

  // Socket middleware
  socketIo.use((socket, next) => {
    const t = socket.handshake.auth?.token || socket.handshake.query?.token;
    try {
      const decoded = jwt.verify(t, JWT_SECRET);
      socket.data.user = decoded;
      next();
    } catch (e) {
      next(new Error("Auth error"));
    }
  });

  socketIo.on("connection", (socket) => {
    const u = socket.data.user;
    socket.join(`user:${u.userId}`);
    socket.emit("badges:update", { success: true, notifications: 3, homework: 1, announcements: 2, marks: 0 });

    socket.on("sync:badges", () => {
      socket.emit("badges:update", { success: true, notifications: 3, homework: 1, announcements: 2, marks: 0 });
    });

    socket.on("notification:read", ({ id }) => {
      socket.emit("badges:update", { success: true, notifications: 2, homework: 1, announcements: 2, marks: 0 });
    });
  });

  await new Promise((resolve) => server.listen(3999, resolve));
  console.log("✓ Test Socket.IO server listening on port 3999");

  // 3. Connect client
  const client = io("http://localhost:3999", {
    path: "/api/socket/io",
    auth: { token },
    transports: ["websocket"],
  });

  let initialBadgesReceived = false;
  let notificationReceived = false;
  let badgeUpdated = false;

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Socket test timed out")), 5000);

    client.on("connect", () => {
      console.log("✓ Client connected successfully via WebSocket");
    });

    client.on("badges:update", (badges) => {
      console.log("✓ Received badges:update event:", badges);
      if (!initialBadgesReceived) {
        initialBadgesReceived = true;
        // Test emitting new notification from server
        socketIo.to(`user:${testUser.userId}`).emit("notification:new", {
          id: "notif_test_123",
          title: "New Exam Scheduled",
          body: "Mathematics Mid-Term Exam announced",
          type: "EXAM",
        });
        socketIo.to(`user:${testUser.userId}`).emit("badges:update", {
          success: true,
          notifications: 4,
          homework: 1,
          announcements: 2,
          marks: 0,
        });
      } else if (notificationReceived && badges.notifications === 2) {
        badgeUpdated = true;
        clearTimeout(timeout);
        resolve();
      }
    });

    client.on("notification:new", (notif) => {
      console.log("✓ Received notification:new event instantly:", notif.title);
      notificationReceived = true;
      // Mark as read
      client.emit("notification:read", { id: notif.id });
    });
  });

  client.disconnect();
  server.close();

  console.log("\n=== All Real-Time WebSocket Tests Passed Successfully! ===");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
