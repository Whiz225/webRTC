const path = require("path");
const dotenv = require("dotenv");

// Load environment variables first
const envResult = dotenv.config({ path: "./config.env" });

// if (envResult.error) {
//   console.error("Error loading .env file:", envResult.error);
// } else {
//   console.log("Environment variables loaded successfully");
// }

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 5000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Serve static files from public directory
app.use(express.static("public"));

// API route for TURN credentials
app.get("/api/get-turn-credentials", async (req, res) => {
  try {
    const accountSid = process.env.ACCOUNTSID;
    const authToken = process.env.AUTHTOKEN;

    if (!accountSid || !authToken) {
      return res.status(500).json({
        message: "Twilio credentials not configured",
        error: "Missing ACCOUNTSID or AUTHTOKEN environment variables",
      });
    }

    const twilio = require("twilio");
    const client = twilio(accountSid, authToken);

    const token = await client.tokens.create();

    res.json({
      token,
      message: "TURN credentials fetched successfully",
    });
  } catch (err) {
    console.error("Error fetching TURN credentials:", err);
    res.status(500).json({
      message: "Failed to fetch TURN credentials",
      error: err.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Serve the main application
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Socket.io connection handling
let connectedPeers = [];
let connectedPeersStrangers = [];

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  connectedPeers.push(socket.id);

  // Send current user count to all clients
  io.emit("user-count", { count: connectedPeers.length });

  socket.on("pre-offer", (data) => {
    const { calleePersonalCode, callType } = data;

    const connectedPeer = connectedPeers.find(
      (peerSocketId) => peerSocketId === calleePersonalCode
    );

    if (connectedPeer) {
      const offerData = {
        callerSocketId: socket.id,
        callType,
      };
      io.to(calleePersonalCode).emit("pre-offer", offerData);
    } else {
      // Notify caller that callee was not found
      socket.emit("pre-offer-answer", {
        preOfferAnswer: "CALLEE_NOT_FOUND",
      });
    }
  });

  socket.on("pre-offer-answer", (data) => {
    const { callerSocketId, callType } = data;

    const connectedPeer = connectedPeers.find(
      (peerSocketId) => peerSocketId === callerSocketId
    );

    if (connectedPeer) {
      const answerData = {
        callerSocketId: socket.id,
        callType,
      };
      io.to(callerSocketId).emit("pre-offer-answer", answerData);
    } else {
      socket.emit("pre-offer-answer", {
        preOfferAnswer: "CALLEE_NOT_FOUND",
      });
    }
  });

  socket.on("webRTC-signaling", (data) => {
    const { connectedUserSocketId } = data;

    const connectedPeer = connectedPeers.find(
      (peerSocketId) => peerSocketId === connectedUserSocketId
    );

    if (connectedPeer) {
      io.to(connectedUserSocketId).emit("webRTC-signaling", data);
    }
  });

  socket.on("user-hanged-up", (data) => {
    const { connectedUserSocketId } = data;

    const connectedPeer = connectedPeers.find(
      (peerSocketId) => peerSocketId === connectedUserSocketId
    );

    if (connectedPeer) {
      io.to(connectedUserSocketId).emit("user-hanged-up");
    }
  });

  socket.on("stranger-connection-status", (data) => {
    const { status } = data;

    if (status) {
      connectedPeersStrangers.push(socket.id);
    } else {
      connectedPeersStrangers = connectedPeersStrangers.filter(
        (peerSocketId) => peerSocketId !== socket.id
      );
    }
  });

  socket.on("get-stranger-socket-id", (data) => {
    const filteredConnectedPeersStrangers = connectedPeersStrangers.filter(
      (peerSocketId) => peerSocketId !== socket.id
    );

    let randomStrangerSocketId = null;

    if (filteredConnectedPeersStrangers.length > 0) {
      randomStrangerSocketId =
        filteredConnectedPeersStrangers[
          Math.floor(Math.random() * filteredConnectedPeersStrangers.length)
        ];
    }

    const responseData = {
      randomStrangerSocketId,
      strangerPoolSize: filteredConnectedPeersStrangers.length,
    };

    io.to(socket.id).emit("stranger-socket-id", responseData);
  });

  socket.on("disconnect", (reason) => {
    connectedPeers = connectedPeers.filter(
      (peerSocketId) => peerSocketId !== socket.id
    );

    connectedPeersStrangers = connectedPeersStrangers.filter(
      (peerSocketId) => peerSocketId !== socket.id
    );

    // Update user count for all remaining clients
    io.emit("user-count", { count: connectedPeers.length });
  });
});

// Error handling
server.on("error", (error) => {
  console.error("Server error:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Start server
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `Twilio Account SID: ${process.env.ACCOUNTSID ? "Configured" : "Missing"}`
  );
});
