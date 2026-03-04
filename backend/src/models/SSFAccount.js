import mongoose from 'mongoose';

const historyEntrySchema = new mongoose.Schema(
  {
    month:                { type: String, required: true }, // "YYYY-MM"
    employeeContribution: { type: Number, required: true },
    employerContribution: { type: Number, required: true },
    payrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payroll',
      required: true,
    },
    paidAt: { type: Date, required: true },
  },
  { _id: false }
);

const ssfAccountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    totalEmployeeContribution: { type: Number, default: 0 },
    totalEmployerContribution: { type: Number, default: 0 },
    totalAccumulated:          { type: Number, default: 0 }, // employee + employer
    history: [historyEntrySchema],
  },
  { timestamps: true }
);

export default mongoose.model('SSFAccount', ssfAccountSchema);
