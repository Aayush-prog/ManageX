import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String, // "YYYY-MM-DD" AD
      required: true,
    },
    clockIn: {
      type: Date,
      required: true,
    },
    clockOut: {
      type: Date,
      default: null,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    totalHours: {
      type: Number,
      default: null,
    },
    excursion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Excursion',
      default: null,
    },
    deviceId: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema, 'attendance');
