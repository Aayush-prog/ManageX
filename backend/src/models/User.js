import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

export const PERMISSION_LEVELS = ['admin', 'manager', 'finance', 'staff'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    // Free-text job title — displayed in UI, not used for access control
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
    },
    // Controls access and which dashboard is shown
    permissionLevel: {
      type: String,
      enum: { values: PERMISSION_LEVELS, message: 'Invalid permission level: {VALUE}' },
      required: [true, 'Permission level is required'],
      default: 'staff',
    },
    monthlySalary: {
      type: Number,
      default: 0,
      min: [0, 'Salary cannot be negative'],
    },
    ssfEmployeePercent: {
      type: Number,
      default: 11,
      min: [0, 'Cannot be negative'],
    },
    ssfEmployerPercent: {
      type: Number,
      default: 20,
      min: [0, 'Cannot be negative'],
    },
    requiredHoursPerDay: {
      type: Number,
      default: 8,
      min: [1, 'Min 1 hour per day'],
      max: [24, 'Max 24 hours per day'],
    },
    overtimeMultiplier: {
      type: Number,
      default: 1.5,
      min: [1, 'Multiplier must be >= 1'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    refreshTokenHash: {
      type: String,
      select: false,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.setRefreshToken = function (token) {
  this.refreshTokenHash = token
    ? createHash('sha256').update(token).digest('hex')
    : null;
};

userSchema.methods.validateRefreshToken = function (token) {
  if (!this.refreshTokenHash || !token) return false;
  const hash = createHash('sha256').update(token).digest('hex');
  return hash === this.refreshTokenHash;
};

userSchema.set('toJSON', {
  transform: (_, ret) => {
    delete ret.password;
    delete ret.refreshTokenHash;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
