const PORT = process.env.PORT || 8000;
const express = require("express");
const { MongoClient } = require("mongodb");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const uri = process.env.URI;
const JWT_SECRET = process.env.JWT_SECRET;

const app = express();

// Allowed origins for CORS
const allowedOrigins = [
  "https://tinder-clone-frontend-sigma.vercel.app",
  "https://tinder-clone-frontend-git-main-aditya6105s-projects.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // CORS logic to handle multiple origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: "GET, POST, PUT, DELETE",
    credentials: true,
  })
);

// Middleware for JSON data
app.use(express.json());
app.options("*", cors()); // Preflight request handling

app.get("/", (req, res) => {
  res.json("Welcome to my app");
});

// Signup Route
app.post("/signup", async (req, res) => {
  const client = new MongoClient(uri);
  const { email, password } = req.body;

  const generatedUserId = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await client.connect();
    const database = client.db("app-data");
    const users = database.collection("users");

    const existingUser = await users.findOne({ email });

    if (existingUser) {
      return res.status(409).send("User already exists. Please login");
    }

    const sanitizedEmail = email.toLowerCase();

    const data = {
      user_id: generatedUserId,
      email: sanitizedEmail,
      hashed_password: hashedPassword,
    };

    const insertedUser = await users.insertOne(data);

    const token = jwt.sign({ userId: generatedUserId }, JWT_SECRET, {
      expiresIn: "24h",
    });
    res.status(201).json({ token, userId: generatedUserId });
  } catch (err) {
    console.error("Error during signup:", err);
    res.status(500).send("Server error");
  } finally {
    await client.close();
  }
});

// Login Route
app.post("/login", async (req, res) => {
  const client = new MongoClient(uri);
  const { email, password } = req.body;

  try {
    await client.connect();
    const database = client.db("app-data");
    const users = database.collection("users");

    const user = await users.findOne({ email });

    if (!user) {
      console.log("User not found");
      return res.status(404).send("User not found");
    }

    const correctPassword = await bcrypt.compare(
      password,
      user.hashed_password
    );

    if (!correctPassword) {
      console.log("Incorrect password");
      return res.status(401).send("Password is incorrect");
    }

    const token = jwt.sign({ userId: user.user_id }, JWT_SECRET, {
      expiresIn: "24h",
    });

    console.log("Login successful. Sending token.");
    res.status(201).json({ token, userId: user.user_id });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).send("Server error");
  } finally {
    await client.close();
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
