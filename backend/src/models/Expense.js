import mongoose from 'mongoose';

const CATEGORIES = ['Travel', 'Equipment', 'Software', 'Marketing', 'Operations', 'Other'];

const expenseSchema = new mongoose.Schema({
  title:      { type: String, required: true, trim: true },
  amount:     { type: Number, required: true, min: 0 },
  category:   { type: String, enum: CATEGORIES, default: 'Other' },
  project:    { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:     { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Approved' },
  date:       { type: Date, default: Date.now },
  notes:      { type: String, trim: true },
  attachment: { type: String },
}, { timestamps: true });

expenseSchema.index({ status: 1 });
expenseSchema.index({ project: 1 });
expenseSchema.index({ date: -1 });

export default mongoose.model('Expense', expenseSchema);
