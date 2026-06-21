import mongoose from "mongoose";

const scanLogSchema = new mongoose.Schema(
  {
    rfid_uid: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    device_id: {
      type: String,
      trim: true,
    },
    accepted: {
      type: Boolean,
      required: true,
    },
    reason: {
      type: String,
      enum: ["clock_in", "clock_out", "duplicate", "unknown", "ignored"],
      required: true,
    },
  },
  { timestamps: true },
);

scanLogSchema.index({ rfid_uid: 1, timestamp: -1 });

export default mongoose.model("ScanLog", scanLogSchema);
