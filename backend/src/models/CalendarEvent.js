import mongoose from 'mongoose';

const calendarEventSchema = new mongoose.Schema(
  {
    title:            { type: String, required: true, trim: true },
    description:      { type: String, trim: true, default: '' },
    date:             { type: Date, required: true },
    type:             { type: String, enum: ['road', 'trail', 'event', 'holiday'], required: true },
    createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organizerContactName:     { type: String, trim: true, default: '' },
    organizerContactPosition: { type: String, trim: true, default: '' },
    contactStatus:    { type: String, enum: ['pending', 'contacted', 'rejected', 'allowed'], default: 'pending' },
    contactNotifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

calendarEventSchema.index({ date: 1 });

export default mongoose.model('CalendarEvent', calendarEventSchema);
