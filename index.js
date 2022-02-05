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
    origin: ["http://localhost:3000", "https://googledocs-eight.vercel.app"],
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const defaultValue = "";
io.on("connection", (socket) => {
  socket.on("get-document", async ({ id, userId, title }) => {
    const document = await findOrCreateDocument({ id, userId, title });
    socket.join(id);
    //console.log(document.title, "document");
    socket.emit("load-document", document);
    socket.on("send-changes", (delta) => {
      socket.broadcast.to(id).emit("receive-changes", delta);
    });
    socket.on("save-document", async ({ data, title }) => {
      //console.log(data, title, "data");
      await Document.findByIdAndUpdate(id, { data, title });
    });
  });

  socket.on("initial_data", async (id) => {
    const data = await Document.find({ userId: id });

    socket.emit("get_data", data);
    // Document.findById(id).then((docs) => {
    //   // io.sockets.emit("get_data", docs);
    //   console.log(id, "id");
    //   console.log("docs", docs);
    //   socket.emit("get_data", docs);
    // });
  });

  socket.on("delete", (docId) => {
    Document.findByIdAndDelete(docId).then((docs) => {
      socket.emit("change_data");
    });
  });

  // socket.on("on-docs", async (userId, type, id) => {
  //   //socket.join(userId);
  //   if (type === "get") {
  //     const data = await getDocs(userId);
  //     console.log(data);
  //     socket.emit("get-docs", data);
  //   }

  //   if (type === "delete") {
  //     if (id !== null) return;
  //     socket.on("delete", async () => {
  //       await deleteDocs(id);
  //       const data = await getDocs(userId);
  //       console.log(data);
  //       socket.emit("get-docs", data);
  //     });
  //   }
  // });
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

async function getDocs(userId) {
  if (userId == null) return;

  const docs = await Document.find({ userId: userId });
  return docs;
}

async function deleteDocs(id) {
  if (id == null) return;

  await Document.findByIdAndDelete(id);
}

app.delete("/doc/:id", async (req, res) => {
  const { id } = req.params;
  if (id == null) return;

  await Document.findByIdAndDelete(id);

  res.json({ status: "ok" });
});

Document.watch().on("change", (change) => {
  console.log(change);
});

server.listen(process.env.PORT || 3001, () => {
  console.log("listening on *:3001");
});
