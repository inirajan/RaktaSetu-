import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

//mini Schema for name
// const nameSchema = new Schema(
//   {
//     firstname: {
//       type: String,
//       required: true,
//     },
//     lastname: {
//       type: String,
//       required: true,
//     },
//   },
//   { _id: false } //prevent  extra _id for embedded schema
// );

const donorSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      required: true,
      min: [0, "Age cannot be negative"],
      max: 120,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], //restrict a field to a specfic set of allowed values
      required: true,
    },
    diseases: {
      type: [String],
      default: [],
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      required: true,
      trim: true, // remove white space
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
      enum: ["donor"],
      default: "donor",
      immutable: true,
    },
    lastDonationDate: {
      type: Date,
      default: null,
    },

    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

donorSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

donorSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.hash(password, this.password);
};

donorSchema.methods.generateAccessToken = async function () {
  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
  const accessTokenExpires = process.env.ACCESS_TOKEN_EXPDATE || "7d";
  if (!accessTokenSecret) {
    throw new apiError(
      500,
      "ACCESS_TOKEN_SECERET is not defined",
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

donorSchema.methods.generateRefreshToken = function () {
  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
  const refreshTokenExpires = process.env.REFRESH_TOKEN_EXPDATE || "7d";
  return jwt.sign(
    {
      _id: this._id,
    },
    refreshTokenSecret,
    { expiresIn: refreshTokenExpires }
  );
};

export const donorModel = model("donor", donorSchema);
