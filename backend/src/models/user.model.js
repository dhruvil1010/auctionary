import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { USER_ROLES } from "../constants.js";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false, // never returned by queries unless explicitly .select("+password")
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "user",
    },
    refreshToken: {
      type: String,
      select: false,
    },
    // Risk #7: bumped on logout. The access token carries the version it was issued
    // with; verifyJWT rejects any token whose version no longer matches, so logging
    // out instantly invalidates outstanding access tokens.
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true } // adds createdAt + updatedAt
);

// Hash the password right before saving — but only when it actually changed,
// so re-saving a user for other reasons doesn't double-hash it.
// NOTE: this is an ASYNC hook, so we do NOT take/call `next`. Modern Mongoose runs
// async hooks promise-style and does not pass a usable `next` (calling it throws
// "next is not a function"). We just return to continue, or throw to abort the save.
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10); // 10 salt rounds
});

// Compare a plaintext password against the stored hash (used at login).
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Short-lived token carrying identity + role (sent on every request).
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      role: this.role,
      tokenVersion: this.tokenVersion, // Risk #7: checked against the DB on every request
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

// Long-lived token used only to obtain a new access token (carries just the id).
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });
};

export const User = mongoose.model("User", userSchema);
