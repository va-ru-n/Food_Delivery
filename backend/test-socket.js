const { io } = require("../frontend/node_modules/socket.io-client");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const token = jwt.sign(
  { id: new mongoose.Types.ObjectId(), role: "customer" },
  "your_super_secret_key"
);

const socket = io("http://localhost:5000", {
  auth: { token },
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("SUCCESS: Socket connected successfully! ID:", socket.id);
  process.exit(0);
});

socket.on("connect_error", (err) => {
  console.error("ERROR: Socket connection failed:", err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error("ERROR: Timeout waiting for socket connection.");
  process.exit(1);
}, 5000);
