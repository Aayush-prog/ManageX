import mongoose from 'mongoose';

const billSchema = new mongoose.Schema({
  vendorName:  { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  amount:      { type: Number, required: true, min: 0 },
  dueDate:     { type: Date },
  project:     { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  attachment:  { type: String, default: null },
  status:      { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },
  paidAt:      { type: Date },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

billSchema.index({ status: 1 });
billSchema.index({ dueDate: 1 });
billSchema.index({ project: 1, status: 1 });  // budget agg: { project, status }

export default mongoose.model('Bill', billSchema);
