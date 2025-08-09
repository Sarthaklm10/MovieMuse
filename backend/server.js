require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in your .env file.");
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const db = process.env.MONGO_URI || "mongodb://localhost:27017/moviemuse";
mongoose
  .connect(db)
  .then(() => console.log("MongoDB Connected..."))
  .catch((err) => console.log(err));

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/watchlist", require("./routes/watchlist"));

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
