import mongoose from 'mongoose';

const calendarEventSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    date:        { type: Date, required: true },
    type:        { type: String, enum: ['road', 'trail', 'event'], required: true },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

calendarEventSchema.index({ date: 1 });

export default mongoose.model('CalendarEvent', calendarEventSchema);
