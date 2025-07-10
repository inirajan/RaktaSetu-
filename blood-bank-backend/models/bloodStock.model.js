import { Schema, model } from "mongoose";

const bloodStockSchema = new Schema(
  {
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: true,
      unique: true,
    },
    unit: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

export const bloodStockModel = model("BloodStock", bloodStockSchema);
