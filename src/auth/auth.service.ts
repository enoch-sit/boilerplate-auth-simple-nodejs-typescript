// src/auth/auth.service.ts
import crypto from 'crypto';
import { User, IUser } from '../models/user.model';
import { Verification, VerificationType } from '../models/verification.model';
import { tokenService } from './token.service';
import { emailService } from '../services/email.service';
import { logger } from '../utils/logger';

export interface SignupResult {
  success: boolean;
  userId?: string;
  message: string;
}

export interface LoginResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    username: string;
    email: string;
    isVerified: boolean;
  };
  message: string;
}

export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  message: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  async signup(username: string, email: string, password: string): Promise<SignupResult> {
    try {
      // Check if username already exists
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return { success: false, message: 'Username already exists' };
      }

      // Check if email already exists
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return { success: false, message: 'Email already exists' };
      }

      // Create user
      const user = await User.create({
        username,
        email,
        password // Password will be hashed by the pre-save hook
      });

      // Generate verification token
      const token = crypto.randomBytes(3).toString('hex').toUpperCase();
      
      // Set token expiration
      const expiresIn = process.env.VERIFICATION_CODE_EXPIRES_IN || '15m';
      const expiresInMs = expiresIn.endsWith('h')
        ? parseInt(expiresIn) * 60 * 60 * 1000
        : parseInt(expiresIn) * 60 * 1000;

      // Save verification token
      await Verification.create({
        userId: user._id,
        type: VerificationType.EMAIL,
        token,
        expires: new Date(Date.now() + expiresInMs)
      });

      // Send verification email
      await emailService.sendVerificationEmail(email, username, token);

      logger.info(`User created: ${username}`);
      return {
        success: true,
        userId: user._id.toString(),
        message: 'User registered successfully. Please verify your email.'
      };
    } catch (error) {
      logger.error('Signup error:', error);
      return { success: false, message: 'Registration failed' };
    }
  }

  /**
   * Verify a user's email with token
   */
  async verifyEmail(token: string): Promise<boolean> {
    try {
      // Find the verification record
      const verification = await Verification.findOne({
        token,
        type: VerificationType.EMAIL,
        expires: { $gt: new Date() }
      });

      if (!verification) {
        logger.warn('Invalid or expired email verification token');
        return false;
      }

      // Find the user
      const user = await User.findById(verification.userId);
      if (!user) {
        logger.error(`User not found for verification token: ${token}`);
        return false;
      }

      // Update user verification status
      user.isVerified = true;
      await user.save();

      // Delete the verification record
      await Verification.deleteOne({ _id: verification._id });

      logger.info(`User verified: ${user.username}`);
      return true;
    } catch (error) {
      logger.error('Email verification error:', error);
      return false;
    }
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(email: string): Promise<boolean> {
    try {
      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        logger.warn(`Resend verification requested for non-existent email: ${email}`);
        return false;
      }

      if (user.isVerified) {
        logger.warn(`Resend verification requested for already verified user: ${user.username}`);
        return false;
      }

      // Delete any existing verification codes
      await Verification.deleteMany({
        userId: user._id,
        type: VerificationType.EMAIL
      });

      // Generate new verification token
      const token = crypto.randomBytes(3).toString('hex').toUpperCase();
      
      // Set token expiration
      const expiresIn = process.env.VERIFICATION_CODE_EXPIRES_IN || '15m';
      const expiresInMs = expiresIn.endsWith('h')
        ? parseInt(expiresIn) * 60 * 60 * 1000
        : parseInt(expiresIn) * 60 * 1000;

      // Save verification token
      await Verification.create({
        userId: user._id,
        type: VerificationType.EMAIL,
        token,
        expires: new Date(Date.now() + expiresInMs)
      });

      // Send verification email
      const emailSent = await emailService.sendVerificationEmail(
        user.email,
        user.username,
        token
      );

      if (!emailSent) {
        logger.error(`Failed to send verification email to ${email}`);
        return false;
      }

      logger.info(`Verification code resent to user: ${user.username}`);
      return true;
    } catch (error) {
      logger.error('Resend verification error:', error);
      return false;
    }
  }

  /**
   * Login a user
   */
  async login(usernameOrEmail: string, password: string): Promise<LoginResult> {
    try {
      // Find user by username or email
      const user = await User.findOne({
        $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
      });

      if (!user) {
        return { success: false, message: 'Invalid credentials' };
      }

      // Check if user is verified
      if (!user.isVerified) {
        return { success: false, message: 'Email not verified' };
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return { success: false, message: 'Invalid credentials' };
      }

      // Generate tokens
      const accessToken = tokenService.generateAccessToken(
        user._id.toString(),
        user.username
      );
      
      const refreshToken = await tokenService.generateRefreshToken(
        user._id.toString(),
        user.username
      );

      logger.info(`User logged in: ${user.username}`);

      return {
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          isVerified: user.isVerified
        },
        message: 'Login successful'
      };
    } catch (error) {
      logger.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenRefreshResult> {
    try {
      // Verify refresh token
      const decoded = await tokenService.verifyRefreshToken(refreshToken);
      
      if (!decoded) {
        return { success: false, message: 'Invalid refresh token' };
      }
      
      // Generate new access token
      const accessToken = tokenService.generateAccessToken(
        decoded.sub,
        decoded.username
      );
      
      return {
        success: true,
        accessToken,
        message: 'Token refreshed successfully'
      };
    } catch (error) {
      logger.error('Token refresh error:', error);
      return { success: false, message: 'Token refresh failed' };
    }
  }

  /**
   * Logout a user
   */
  async logout(refreshToken: string): Promise<boolean> {
    try {
      return await tokenService.deleteRefreshToken(refreshToken);
    } catch (error) {
      logger.error('Logout error:', error);
      return false;
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string): Promise<boolean> {
    try {
      return await tokenService.deleteAllUserRefreshTokens(userId);
    } catch (error) {
      logger.error('Logout all error:', error);
      return false;
    }
  }
}

export const authService = new AuthService();