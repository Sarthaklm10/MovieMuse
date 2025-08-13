require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const watchlistRoutes = require("./routes/watchlist");
const moviesRoutes = require("./routes/movies");

if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in your .env file.");
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 5000;

// CORS Allowed originsw
const allowedOrigins = [
  "http://localhost:3000", // React dev server
  "https://moviemuse-sar.netlify.app", // Netlify frontend
];

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like Postman or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy: Origin not allowed"));
    },
    credentials: true, // allow cookies/authorization headers
  })
);

app.use(express.json());

// MongoDB Connection
const db = process.env.MONGO_URI || "mongodb://localhost:27017/moviemuse";
mongoose
  .connect(db)
  .then(() => console.log("MongoDB Connected..."))
  .catch((err) => console.error(err));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/movies", moviesRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
