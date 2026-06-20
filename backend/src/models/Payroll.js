import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // "YYYY-MM"
    month: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}$/, 'Month must be YYYY-MM'],
    },
    baseSalary:         { type: Number, required: true },
    ssfBase:            { type: Number, required: true }, // 60% of baseSalary — SSF is calculated on this
    employeeSSF:        { type: Number, required: true },
    employerSSF:        { type: Number, required: true },
    totalSSF:           { type: Number, required: true },
    tdsPercent:         { type: Number, default: 1 },
    tds:                { type: Number, default: 0 },
    finalPayableSalary: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Paid'],
      default: 'Pending',
    },
    paidAt: {
      type: Date,
      default: null,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
  },
  { timestamps: true }
);

// One payroll record per user per month
payrollSchema.index({ user: 1, month: 1 }, { unique: true });
// Finance listing by month
payrollSchema.index({ month: 1, status: 1 });

export default mongoose.model('Payroll', payrollSchema);
