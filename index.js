const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const Document = require("./Document");

mongoose.connect(
  "mongodb+srv://googled:googledpw@cluster0.hgy4n.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"
);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
  },
});

const defaultValue = "";
io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("get-document", async (id) => {
    const document = await findOrCreateDocument(id);
    socket.join(id);
    console.log(id);
    socket.emit("load-document", document.data);
    socket.on("send-changes", (delta) => {
      console.log("message: " + JSON.stringify(delta.ops));
      socket.broadcast.to(id).emit("receive-changes", delta);
    });
    socket.on("save-document", async (data) => {
      await Document.findByIdAndUpdate(id, { data });
    });
  });
});

async function findOrCreateDocument(id) {
  if (id == null) return;

  const document = await Document.findById(id);
  if (document) return document;
  return await Document.create({ _id: id, data: defaultValue });
}

server.listen(3001, () => {
  console.log("listening on *:3000");
});
