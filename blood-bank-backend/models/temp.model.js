import { Schema, model } from "mongoose";

const tempSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["registration", "email_change"],
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: function () {
        return this.type === "email_change";
      },
    },
    userType: {
      type: String,
      enum: ["donor", "patient"],
      required: function () {
        return this.type === "email_change";
      },
    },
    data: Object,
    token: String,
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    },
  },
  { timestamps: true }
);

tempSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// tempSchema.pre("save", async function (next) {
//   if (this.isModified("data.password")) {
//     this.data.password = await bcrypt.hash(this.data.password, 10);
//   }
//   console.log(this.data.password);
//   next();
// });

export const tempModel = model("TempStorage", tempSchema);
