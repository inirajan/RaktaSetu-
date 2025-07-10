import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { apiError } from "../utils/apiError.util.js";

dotenv.config();

const adminSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "password is required"],
    },
    role: {
      type: String,
      enum: ["admin"],
      default: "admin",
      immutable: true,
    },
    refreshToken: {
      type: String,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "deactivated"],
      default: "active",
    },
  },
  { timestamps: true }
);

//hashing password
adminSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

//comparing hashing pass with hasing pass
adminSchema.methods.checkPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

//generating access token
adminSchema.methods.generateAccessToken = function () {
  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
  const accessTokenExpires = process.env.ACCESS_TOKEN_EXPDATE || " 7d";

  if (!accessTokenSecret) {
    throw new apiError(
      400,
      "ACCESS_TOKEN_SECERET is not defined",
      "define token in .env"
    );
  }

  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
      role: this.role,
    },
    accessTokenSecret,
    {
      expiresIn: accessTokenExpires,
    }
  );
};

//generating refresh token
adminSchema.methods.generateRefreshToken = function () {
  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
  const refreshTokenExpires = process.env.REFRESH_TOKEN_EXPDATE;

  if (!refreshTokenSecret) {
    throw new apiError(
      400,
      "REFRESH_TOKEN_SECRET is not defined",
      "define token in .env"
    );
  }

  return jwt.sign(
    {
      _id: this._id,
    },
    refreshTokenSecret,
    {
      expiresIn: refreshTokenExpires,
    }
  );
};

export const adminModel = model("admin", adminSchema);
