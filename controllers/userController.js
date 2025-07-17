import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import sendEmail from '../utils/sendEmail.js';

const GENDER_ENUM = ['Male', 'Female', 'No preference'];

function dobToUTC(dateStr) {
  // Convert YYYY-MM-DD (IST) to UTC
  const istDate = new Date(dateStr + 'T00:00:00+05:30');
  return new Date(istDate.toISOString());
}

export const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, dateOfBirth, genderPreference } = req.body;
    // Validation
    if (!firstName || !lastName || !email || !password || !dateOfBirth || !genderPreference) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    if (!GENDER_ENUM.includes(genderPreference)) {
      return res.status(400).json({ message: 'Invalid gender preference.' });
    }
    const dobUTC = dobToUTC(dateOfBirth);
    if (isNaN(dobUTC.getTime())) {
      return res.status(400).json({ message: 'Invalid date of birth.' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already exists.' });
    }
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      dateOfBirth: dobUTC,
      genderPreference,
      isVerified: false
    });
    await user.save();
    const { password: _, otp, otpExpiresAt, ...userData } = user.toObject();
    res.status(201).json({ message: 'User created successfully.', user: userData });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const sendOtp = async (req, res) => {
  try {
    const { firstName, lastName, email, password, dateOfBirth, genderPreference } = req.body;
    // Validation (same as createUser)
    if (!firstName || !lastName || !email || !password || !dateOfBirth || !genderPreference) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    if (!GENDER_ENUM.includes(genderPreference)) {
      return res.status(400).json({ message: 'Invalid gender preference.' });
    }
    const dobUTC = dobToUTC(dateOfBirth);
    if (isNaN(dobUTC.getTime())) {
      return res.status(400).json({ message: 'Invalid date of birth.' });
    }
    let user = await User.findOne({ email });
    if (user && user.isVerified) {
      return res.status(409).json({ message: 'Email already exists and is verified.' });
    }
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min
    if (!user) {
      user = new User({
        firstName,
        lastName,
        email,
        password,
        dateOfBirth: dobUTC,
        genderPreference,
        isVerified: false,
        otp,
        otpExpiresAt
      });
    } else {
      user.firstName = firstName;
      user.lastName = lastName;
      user.password = password;
      user.dateOfBirth = dobUTC;
      user.genderPreference = genderPreference;
      user.isVerified = false;
      user.otp = otp;
      user.otpExpiresAt = otpExpiresAt;
    }
    await user.save();
    // Send OTP email
    console.log(`Mock OTP sent to ${email}: ${otp}`);
    res.json({ message: 'OTP "sent" (logged to console in dev mode).' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: 'User already verified.' });
    }
    if (user.otp !== Number(otp) || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();
    res.json({ message: 'Account verified successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email with OTP before logging in.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}; 