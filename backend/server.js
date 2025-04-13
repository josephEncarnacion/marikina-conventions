// file: server.js
require("dotenv").config();
const express = require("express");
const sql = require("mssql");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const app = express();

app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

app.use(
  session({
    secret: "your-session-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 }, // 1 hour
  })
);

// Database config
const dbConfig = {
  server: "localhost",
  port: 1433,
  database: "Reservation_Hotel",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  authentication: {
    type: "default",
  },
  user: "sa",
  password: "123",
};

async function connectDB() {
  try {
    await sql.connect(dbConfig);
    console.log("✅ MSSQL Database Connected Successfully!");
  } catch (err) {
    console.error("❌ Database Connection Failed: ", err.message);
  }
}

connectDB();

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const role = "user";
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await sql.connect(dbConfig);
    await sql.query`INSERT INTO Users (username, password, role) VALUES (${username}, ${hashedPassword}, ${role})`;
    res.json({ message: "User registered successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Registration failed!" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    await sql.connect(dbConfig);
    const result = await sql.query`SELECT * FROM Users WHERE username = ${username}`;
    const user = result.recordset[0];

    if (user && (await bcrypt.compare(password, user.password))) {
      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
      };
      res.json({ message: "Login successful", user: req.session.user });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed!" });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed!" });
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });
});


// server.js
app.get("/session", (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ error: "No session found" });
  }
});


app.post("/admin/add-room", async (req, res) => {
  const { roomType, price, features, guests, amenities } = req.body;

  try {
    await sql.connect(dbConfig);
    await sql.query`INSERT INTO Rooms (roomType, price, features, guests, amenities) VALUES (${roomType}, ${price}, ${features}, ${guests}, ${amenities})`;
    res.json({ message: "Room added successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add room!" });
  }
});
app.get("/rooms", async (req, res) => {
  try {
    await sql.connect(dbConfig);
    const result = await sql.query("SELECT * FROM Rooms");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch rooms!" });
  }
});
app.post("/reserve-room", async (req, res) => {
  const {
    userId,
    roomId,
    checkInDate,
    checkOutDate,
    status,
    guestDetails,
    paymentMethod,
    totalAmount,
  } = req.body;

  if (!userId || !roomId || !checkInDate || !checkOutDate) {
    return res.status(400).json({
      error:
        "User ID, Room ID, Check-in Date, and Check-out Date are required!",
    });
  }

  try {
    await sql.connect(dbConfig);
    await sql.query`
            INSERT INTO Reservations (
                userId, 
                roomId, 
                checkInDate, 
                checkOutDate, 
                status,
                guestName,
                guestEmail,
                guestPhone,
                specialRequests,
                paymentMethod,
                totalAmount
            ) 
            VALUES (
                ${userId}, ${roomId}, ${checkInDate}, ${checkOutDate}, ${status || "Pending"}, ${guestDetails?.name || null},
                ${guestDetails?.email || null}, ${guestDetails?.phone || null},${guestDetails?.specialRequests || null},
                ${paymentMethod || null},${totalAmount || null}
            )`;

    res.json({ message: "Room reserved successfully!" });
  } catch (err) {
    console.error("Error reserving room:", err);
    res.status(500).json({ error: "Reservation failed!" });
  }
});

app.get("/", (req, res) => {
  res.send("API is Running...");
});

app.listen(5000, () => console.log("Server running on port 5000"));
