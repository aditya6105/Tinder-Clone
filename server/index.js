const PORT = 8000;
const express = require("express");
const { MongoClient } = require("mongodb");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const uri = process.env.URI; // Ensure this is set in your environment variables
const JWT_SECRET = process.env.JWT_SECRET; // Add this in your environment variables

const app = express();
app.use(
  cors({
    origin:
      "https://tinder-clone-frontend-git-main-aditya6105s-projects.vercel.app", // Ensure this matches your frontend URL
    methods: "GET, POST, PUT, DELETE",
    credentials: true, // Important if using cookies/auth
  })
);
app.use(express.json());

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

// Get Individual User
app.get("/user", async (req, res) => {
  const client = new MongoClient(uri);
  const userId = req.query.userId;

  try {
    await client.connect();
    const database = client.db("app-data");
    const users = database.collection("users");

    const query = { user_id: userId };
    const user = await users.findOne(query);
    res.send(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).send("Server error");
  } finally {
    await client.close();
  }
});

// Get all Users by userIds in the Database
app.get("/users", async (req, res) => {
  const client = new MongoClient(uri);
  const userIds = JSON.parse(req.query.userIds);

  try {
    await client.connect();
    const database = client.db("app-data");
    const users = database.collection("users");

    const pipeline = [
      {
        $match: {
          user_id: {
            $in: userIds,
          },
        },
      },
    ];

    const foundUsers = await users.aggregate(pipeline).toArray();

    res.json(foundUsers);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).send("Server error");
  } finally {
    await client.close();
  }
});

// Get Gendered Users
app.get("/gendered-users", async (req, res) => {
  const client = new MongoClient(uri);
  const gender = req.query.gender;

  try {
    await client.connect();
    const database = client.db("app-data");
    const users = database.collection("users");
    const query = { gender_identity: { $eq: gender } };
    const foundUsers = await users.find(query).toArray();
    res.json(foundUsers);
  } catch (err) {
    console.error("Error fetching gendered users:", err);
    res.status(500).send("Server error");
  } finally {
    await client.close();
  }
});

// Update User
app.put("/user", async (req, res) => {
  const client = new MongoClient(uri);
  const formData = req.body.formData;

  try {
    await client.connect();
    const database = client.db("app-data");
    const users = database.collection("users");

    const query = { user_id: formData.user_id };
    const updateDocument = {
      $set: formData,
    };
    const result = await users.updateOne(query, updateDocument);
    res.send(result);
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).send("Server error");
  } finally {
    await client.close();
  }
});

// Add Match
app.put("/addmatch", async (req, res) => {
  const client = new MongoClient(uri);
  const { userId, matchedUserId } = req.body;

  try {
    await client.connect();
    const database = client.db("app-data");
    const users = database.collection("users");

    const query = { user_id: userId };
    const updateDocument = {
      $push: { matches: { user_id: matchedUserId } },
    };
    const result = await users.updateOne(query, updateDocument);
    res.send(result);
  } catch (err) {
    console.error("Error adding match:", err);
    res.status(500).send("Server error");
  } finally {
    await client.close();
  }
});

// Get Messages between Users
app.get("/messages", async (req, res) => {
  const { userId, correspondingUserId } = req.query;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db("app-data");
    const messages = database.collection("messages");

    const query = {
      from_userId: userId,
      to_userId: correspondingUserId,
    };
    const foundMessages = await messages.find(query).toArray();
    res.send(foundMessages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).send("Server error");
  } finally {
    await client.close();
  }
});

// Add a Message
app.post("/message", async (req, res) => {
  const client = new MongoClient(uri);
  const message = req.body.message;

  try {
    await client.connect();
    const database = client.db("app-data");
    const messages = database.collection("messages");

    const insertedMessage = await messages.insertOne(message);
    res.send(insertedMessage);
  } catch (err) {
    console.error("Error adding message:", err);
    res.status(500).send("Server error");
  } finally {
    await client.close();
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
