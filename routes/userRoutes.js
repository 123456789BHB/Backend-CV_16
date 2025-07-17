import express from 'express';
import {
  createUser,
  sendOtp,
  verifyOtp,
  loginUser
} from '../controllers/userController.js';

const router = express.Router();

router.post('/create', createUser);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/login', loginUser);

export default router; 