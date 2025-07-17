import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const GENDER_ENUM = ['Male', 'Female', 'No preference'];

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  genderPreference: { type: String, required: true, enum: GENDER_ENUM },
  isVerified: { type: Boolean, default: false },
  otp: { type: Number },
  otpExpiresAt: { type: Date },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  // Convert dateOfBirth from IST (YYYY-MM-DD) to UTC if it's a string
  if (typeof this.dateOfBirth === 'string') {
    const istDate = new Date(this.dateOfBirth + 'T00:00:00+05:30');
    this.dateOfBirth = new Date(istDate.toISOString());
  }
  next();
});

const User = mongoose.model('User', userSchema);
export default User; 