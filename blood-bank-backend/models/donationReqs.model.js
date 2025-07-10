import { Schema, model } from "mongoose";

const donationReqSchema = new Schema(
  {
    donorId: {
      type: Schema.Types.ObjectId,
      ref: "donor",
      required: true,
    },
    unit: {
      type: Number,
      required: true,
      min: 1,
    },
    disease: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    approved: {
      type: Schema.Types.ObjectId,
      ref: "admin",
    },
    approvalDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

export const donationReqsModel = model("DonationRequest", donationReqSchema);
