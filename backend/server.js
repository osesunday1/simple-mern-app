// server.js
import express from "express";
import mongoose from "mongoose";
import AWS from "aws-sdk";
import cors from "cors";
import dotenv from "dotenv";
import Message from "./models/Message.js";

// Initialize app
const app = express();
app.use(cors());
app.use(express.json());

// Load .env locally first (for dev/offline use)
dotenv.config();

// ✅ Create SSM client
const ssm = new AWS.SSM({ region: "ca-central-1" });

// ✅ Function to load environment variables from SSM Parameter Store
async function loadEnvFromSSM() {
  try {
    const params = {
      Names: ["MONGO_URI", "PORT"],
      WithDecryption: true,
    };

    const response = await ssm.getParameters(params).promise();

    if (response.Parameters && response.Parameters.length > 0) {
      response.Parameters.forEach((param) => {
        const key = param.Name.split("/").pop(); // e.g. MONGO_URI
        process.env[key] = param.Value;
      });
      console.log("✅ Environment variables loaded from SSM");
    } else {
      console.warn("⚠️ No parameters found in SSM; using local .env values");
    }
  } catch (err) {
    console.warn("⚠️ Failed to load from SSM, falling back to .env file");
  }
}

// ✅ Function to connect to MongoDB
async function connectToMongo() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}

// ✅ Define routes
app.get("/", (req, res) => {
  res.send("Hello from MERN backend over HTTP (behind ALB HTTPS)!");
});

app.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/messages", async (req, res) => {
  try {
    const { text } = req.body;
    const newMessage = new Message({ text });
    await newMessage.save();
    res.json(newMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Main startup
async function startServer() {
  // 1️⃣ Try to load from SSM first, fallback to .env if offline
  await loadEnvFromSSM();

  // 2️⃣ Connect to MongoDB
  await connectToMongo();

  // 3️⃣ Start Express server
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

startServer();