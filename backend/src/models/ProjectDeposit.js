import mongoose from 'mongoose';

const DEPOSIT_CATEGORIES = ['Client Payment', 'Advance', 'Reimbursement', 'Grant', 'Investment', 'Other'];

const projectDepositSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: DEPOSIT_CATEGORIES,
      default: 'Client Payment',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
    },
    attachment: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

projectDepositSchema.index({ project: 1 });
projectDepositSchema.index({ date: -1 });

export const DEPOSIT_CATEGORIES_LIST = DEPOSIT_CATEGORIES;
export default mongoose.model('ProjectDeposit', projectDepositSchema);
