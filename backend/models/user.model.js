const { type } = require("@testing-library/user-event/dist/type");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const movieSchema = new Schema({
  imdbID: { type: String, required: true },
  Title: { type: String, required: true },
  Year: String,
  Poster: String,
  runtime: String,
  imdbRating: Number,
  userRating: Number,
  userReview: String,
});

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    watched: [movieSchema],
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
  