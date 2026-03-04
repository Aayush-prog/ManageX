import mongoose from 'mongoose';

const projectBudgetSchema = new mongoose.Schema({
  project:         { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
  allocatedBudget: { type: Number, required: true, default: 0 },
  totalSpent:      { type: Number, default: 0 },
}, { timestamps: true });

projectBudgetSchema.virtual('remainingBudget').get(function () {
  return this.allocatedBudget - this.totalSpent;
});

projectBudgetSchema.set('toJSON',   { virtuals: true });
projectBudgetSchema.set('toObject', { virtuals: true });

export default mongoose.model('ProjectBudget', projectBudgetSchema);
