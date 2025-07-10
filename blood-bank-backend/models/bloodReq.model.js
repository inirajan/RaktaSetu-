import { Schema, model } from "mongoose";

const bloodReqSchema = new Schema(
  {
    requesterId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "requesterType",
    },
    requesterType: {
      type: String,
      required: true,
      enum: ["donor", "patient"],
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: true,
    },
    unit: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "admin",
    },
    approvalDate: {
      type: Date,
    },

    matchedDonorsInfo: [
      {
        fullName: { type: String },
        email: { type: String },
        bloodGroup: { type: String },
        lastDonationDate: { type: Date },
        diseases: [{ type: String }],
      },
    ],
  },
  { timestamps: true }
);

export const bloodReqModel = model("BloodRequest", bloodReqSchema);
