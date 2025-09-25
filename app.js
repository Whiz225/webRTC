const express = require("express");
const http = require("http");
const { Socket } = require("socket.io");

const PORT = process.env.PORT || 5000;
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server);

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

let connectedPeers = [];
let connectedPeersStrangers = [];

io.on("connection", (Socket) => {
  connectedPeers.push(Socket.id);

  Socket.on("pre-offer", (data) => {
    const { calleePersonalCode, callType } = data;
    const connectedPeer = connectedPeers.filter(
      (peerSocketId) => peerSocketId === calleePersonalCode
    );
    if (connectedPeer) {
      const data = {
        callerSocketId: Socket.id,
        callType,
      };

      io.to(calleePersonalCode).emit("pre-offer", data);
    }
  });

  Socket.on("pre-offer-answer", (data) => {
    const { callerSocketId, callType } = data;

    const connectedPeer = connectedPeers.filter(
      (peerSocketId) => peerSocketId === callerSocketId
    );

    if (connectedPeer) {
      const data = {
        callerSocketId: Socket.id,
        callType,
      };
      io.to(callerSocketId).emit("pre-offer-answer", data);
    } else {
      const data = {
        preOfferAnswer: "CALLEE_NOT_FOUND",
      };
      io.to(Socket.id).emit("pre-offer-answer", data);
    }
  });

  Socket.on("webRTC-signaling", (data) => {
    const { connectedUserSocketId } = data;

    const connectedPeer = connectedPeers.filter(
      (peerSocketId) => peerSocketId === connectedUserSocketId
    );

    if (connectedPeer) {
      io.to(connectedUserSocketId).emit("webRTC-signaling", data);
    }
  });

  Socket.on("user-hanged-up", (data) => {
    const { connectedUserSocketId } = data;
    const connectedPeer = connectedPeers.find(
      (peerSocketId) => peerSocketId === connectedUserSocketId
    );
    if (connectedPeer) {
      io.to(connectedUserSocketId).emit("user-hanged-up");
    }
  });

  Socket.on("stranger-connection-status", (data) => {
    const { status } = data;
    if (status) {
      connectedPeersStrangers.push(Socket.id);
    } else {
      const newConnectedPeersStrangers = connectedPeersStrangers.filter(
        (peerSocketId) => peerSocketId !== Socket.id
      );

      connectedPeersStrangers = newConnectedPeersStrangers;
    }
  });

  Socket.on("get-stranger-socket-id", (data) => {
    let randomStrangerSocketId;
    const filteredConnectedPeersStrangers = connectedPeersStrangers.filter(
      (peerSocketId) => peerSocketId !== Socket.id
    );

    if (filteredConnectedPeersStrangers.length > 0) {
      randomStrangerSocketId =
        filteredConnectedPeersStrangers[
          Math.floor(Math.random() * filteredConnectedPeersStrangers.length)
        ];
    } else {
      randomStrangerSocketId = null;
    }

    const data2 = {
      randomStrangerSocketId,
    };

    io.to(Socket.id).emit("stranger-socket-id", data2);
  });

  Socket.on("disconnect", () => {
    const newConnectedPeers = connectedPeers.filter(
      (peerSocketId) => peerSocketId !== Socket.id
    );
    connectedPeers = newConnectedPeers;

    const newConnectedPeersStrangers = connectedPeersStrangers.filter(
      (peerSocketId) => peerSocketId !== Socket.id
    );
    connectedPeersStrangers = newConnectedPeersStrangers;
  });
});

server.listen(PORT, () => {
  console.log(`listening to port ${PORT}`);
});
