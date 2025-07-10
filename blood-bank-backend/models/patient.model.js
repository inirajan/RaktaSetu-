import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { apiError } from "../utils/apiError.util.js";

const patientSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      required: true,
      min: [0, "Age cannot be negative"],
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: true,
    },
    disease: {
      type: [String],
      default: [],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: ["patient"],
      default: "patient",
      immutable: true,
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

patientSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

patientSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

patientSchema.methods.generateAccessToken = function () {
  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
  const accessTokenExpires = process.env.ACCESS_TOKEN_EXPDATE || "7d";
  if (!accessTokenSecret) {
    throw new apiError(
      500,
      "ACCESS_TOKEN_SECRET is not defined ",
      "define token in .env"
    );
  }
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      role: this.role,
    },
    accessTokenSecret,
    { expiresIn: accessTokenExpires }
  );
};

patientSchema.methods.generateRefreshToken = function () {
  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
  const refreshTokenExpires = process.env.REFRESH_TOKEN_EXPDATE || "7d";

  if (!refreshTokenSecret) {
    throw new apiError(
      500,
      "REFRESH_TOKEN_SECRET is not defined",
      "define token in .env"
    );
  }
  return jwt.sign(
    {
      _id: this._id,
      role: this.role,
    },
    refreshTokenSecret,
    { expiresIn: refreshTokenExpires }
  );
};

// patientSchema.methods.generateEmailVerificationToken = function () {
//   const verificationToken = crypto.randomBytes(16).toString("hex");
//   this.emailVerificationToken = crypto
//     .createHash("sha256")
//     .update(verificationToken)
//     .digest("hex");
//   this.emailVerificationTokenExpiry = Date.now() + 3600000; // 1 hour in milliseconds

//   return verificationToken; // this unhased token , will be send to email
// };

// patientSchema.methods.clearEmailVerificationToken = function () {
//   this.emailVerificationToken = undefined;
//   this.emailVerificationTokenExpiry = undefined;
// };

export const patientModel = model("patient", patientSchema);
