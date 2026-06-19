import mongoose from 'mongoose';

export const TEAM_ROLES = ['admin', 'finance', 'volunteer', 'staff', 'coordinator', 'viewer'];

const teamMembershipSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    role: { type: String, enum: TEAM_ROLES, required: true },
  },
  { timestamps: true }
);

teamMembershipSchema.index({ user: 1, team: 1 }, { unique: true });

teamMembershipSchema.set('toJSON', {
  transform: (_, ret) => { delete ret.__v; return ret; }
});

export default mongoose.model('TeamMembership', teamMembershipSchema);
