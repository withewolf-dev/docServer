const express = require("express");
const app = express();
const http = require("http");
const bodyParser = require("body-parser");
const server = http.createServer(app);
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const Document = require("./Document");
const cors = require("cors");

app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));

// Parses the text as json
app.use(bodyParser.json());

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
  socket.on("get-document", async ({ id, userId, title }) => {
    const document = await findOrCreateDocument({ id, userId, title });
    socket.join(id);
    console.log(document.title, "document");
    socket.emit("load-document", document);
    socket.on("send-changes", (delta) => {
      console.log("message: " + JSON.stringify(delta.ops));
      socket.broadcast.to(id).emit("receive-changes", delta);
    });
    socket.on("save-document", async ({ data, title }) => {
      //console.log(data, title, "data");
      await Document.findByIdAndUpdate(id, { data, title });
    });
  });
});

async function findOrCreateDocument({ id, userId, title }) {
  if (id == null) return;

  const document = await Document.findById(id);
  if (document) return document;
  return await Document.create({ _id: id, data: defaultValue, userId, title });
}

//get document
app.get("/doc/:userId", async (req, res) => {
  const { userId } = req.params;

  if (userId == null) return;

  const docs = await Document.find({ userId: userId });
  res.json(docs);
});

app.delete("/doc/:id", async (req, res) => {
  const { id } = req.params;
  if (id == null) return;

  await Document.findByIdAndDelete(id);

  res.json({ status: "ok" });
});

server.listen(3001, () => {
  console.log("listening on *:3001");
});
