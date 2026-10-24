const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const { protect } = require("./middleware/authMiddleware");
const profileRoutes = require("./routes/profileRoutes");
const postRoutes = require("./routes/postRoutes");
const followRoutes = require("./routes/followRoutes");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/users", profileRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", followRoutes);
app.get("/", (req, res) => {
  res.json({
    message: "Social Community API is running 🚀",
  });
});

app.get("/api/auth/protected", protect, (req, res) => {
  res.status(200).json({
    message: "You accessed a protected route successfully!",
    userId: req.userId,
  });
});

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
