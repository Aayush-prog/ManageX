import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

const ROLES = ['ceo', 'manager', 'it', 'finance', 'videographer', 'photographer'];

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
    role: {
      type: String,
      enum: { values: ROLES, message: 'Invalid role: {VALUE}' },
      required: [true, 'Role is required'],
    },
    monthlySalary: {
      type: Number,
      default: 0,
      min: [0, 'Salary cannot be negative'],
    },
    ssfEmployeePercent: {
      type: Number,
      default: 11, // Nepal standard: employee contributes 11%
      min: [0, 'Cannot be negative'],
    },
    ssfEmployerPercent: {
      type: Number,
      default: 20, // Nepal standard: employer contributes 20%
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
    // SHA-256 hash of current refresh token (for server-side invalidation)
    refreshTokenHash: {
      type: String,
      select: false,
      default: null,
    },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method: compare plain password
userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Instance method: store hashed refresh token
userSchema.methods.setRefreshToken = function (token) {
  this.refreshTokenHash = token
    ? createHash('sha256').update(token).digest('hex')
    : null;
};

// Instance method: validate incoming refresh token against hash
userSchema.methods.validateRefreshToken = function (token) {
  if (!this.refreshTokenHash || !token) return false;
  const hash = createHash('sha256').update(token).digest('hex');
  return hash === this.refreshTokenHash;
};

// Remove sensitive fields from JSON output
userSchema.set('toJSON', {
  transform: (_, ret) => {
    delete ret.password;
    delete ret.refreshTokenHash;
    delete ret.__v;
    return ret;
  },
});

export const VALID_ROLES = ROLES;
export default mongoose.model('User', userSchema);
