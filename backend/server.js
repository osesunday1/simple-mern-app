// server.js
import express from "express";
import mongoose from "mongoose";
import AWS from "aws-sdk";     // ✅ Import AWS SDK
import cors from "cors";
import Message from "./models/Message.js";

// Initialize app
const app = express();
app.use(cors());
app.use(express.json());

// ✅ Create an SSM client (Systems Manager Parameter Store)
const ssm = new AWS.SSM({ region: "ca-central-1" });

// ✅ Function to load environment variables from SSM
async function loadEnvFromSSM() {
  try {
    const params = {
      Names: [
        "MONGO_URI",
        "PORT",
      ],
      WithDecryption: true,
    };

    const response = await ssm.getParameters(params).promise();
    //Assign values to process.env
    response.Parameters.forEach((param) => {
      const key = param.Name.split("/").pop(); // Extract MONGO_URI, PORT
      process.env[key] = param.Value;
    });

    console.log("Environment variables loaded from SSM");
  } catch (err) {
    console.error("Error loading SSM parameters:", err);
    process.exit(1); // Stop app if we can’t load env vars
  }
}

// ✅ Main async function to start app
async function startServer() {
  // Load environment variables from Parameter Store
  await loadEnvFromSSM();

  // Connect to MongoDB using the fetched value
  mongoose
    .connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));

  // Routes
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

  // ✅ Start HTTP Server after env vars are ready
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

// Run the server
startServer();