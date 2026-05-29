import mongoose from 'mongoose';

const gpxFileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export default mongoose.model('GpxFile', gpxFileSchema);
