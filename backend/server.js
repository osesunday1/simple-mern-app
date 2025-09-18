import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import Message from "./models/Message.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

console.log(process.env.MONGO_URI)

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ Mongo error:", err));

// Routes
app.get("/", (req, res) => {
  res.send("Hello from MERN backend!");
});

app.get("/messages", async (req, res) => {
  const messages = await Message.find();
  res.json(messages);
});

app.post("/messages", async (req, res) => {
  const { text } = req.body;
  const newMessage = new Message({ text });
  await newMessage.save();
  res.json(newMessage);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
