import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  endpoint:     { type: String, required: true },
  keys: {
    p256dh: { type: String, required: true },
    auth:   { type: String, required: true },
  },
}, { timestamps: true });

// One subscription per endpoint
schema.index({ endpoint: 1 }, { unique: true });
schema.index({ user: 1 });

export default mongoose.model('PushSubscription', schema);
