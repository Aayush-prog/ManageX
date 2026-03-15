import mongoose from 'mongoose';

const gpxTrackSchema = new mongoose.Schema({
  title:      { type: String, required: true, trim: true },
  description:{ type: String, default: '' },
  filename:   { type: String, required: true },   // original file name
  url:        { type: String, required: true },   // /uploads/...
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('GpxTrack', gpxTrackSchema);
