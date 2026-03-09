import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Local date string "YYYY-MM-DD" in configured timezone
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'],
    },
    clockIn: {
      type: Date,
      required: true,
    },
    clockOut: {
      type: Date,
      default: null,
    },
    // Computed on clock-out, in hours (2 decimal places)
    totalHours: {
      type: Number,
      default: null,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Prevent duplicate attendance for the same user on the same date
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

// Speed up the auto clock-out job query
attendanceSchema.index({ date: 1, clockOut: 1 });

export default mongoose.model('Attendance', attendanceSchema);
