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

/**
 * AuthService class handles user authentication and related operations.
 * It provides methods for user registration, email verification, login, token refresh, and logout.
 */
export class AuthService {
  /**
   * Register a new user with the provided credentials.
   * 
   * @param username - The desired username for the new user.
   * @param email - The email address of the new user.
   * @param password - The password for the new user (will be hashed before storage).
   * @returns A Promise that resolves to a SignupResult object indicating the success or failure of the registration.
   */
  async signup(username: string, email: string, password: string): Promise<SignupResult> {
    try {
      // Check if the provided username already exists in the database
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return { success: false, message: 'Username already exists' };
      }

      // Check if the provided email already exists in the database
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return { success: false, message: 'Email already exists' };
      }

      // Create a new user document in the database
      const user = await User.create({
        username,
        email,
        password // Password will be hashed by the pre-save hook in the User model
      });

      // Generate a random 3-character verification token
      const token = crypto.randomBytes(3).toString('hex').toUpperCase();
      
      // Set the expiration time for the verification token
      const expiresIn = process.env.VERIFICATION_CODE_EXPIRES_IN || '15m';
      const expiresInMs = expiresIn.endsWith('h')
        ? parseInt(expiresIn) * 60 * 60 * 1000
        : parseInt(expiresIn) * 60 * 1000;

      // Save the verification token in the database
      await Verification.create({
        userId: user._id,
        type: VerificationType.EMAIL,
        token,
        expires: new Date(Date.now() + expiresInMs)
      });

      // Send a verification email to the user with the generated token
      await emailService.sendVerificationEmail(email, username, token);

      // Log the successful user creation
      logger.info(`User created: ${username}`);
      return {
        success: true,
        userId: user._id.toString(),
        message: 'User registered successfully. Please verify your email.'
      };
    } catch (error) {
      // Log any errors that occur during the signup process
      logger.error('Signup error:', error);
      return { success: false, message: 'Registration failed' };
    }
  }

  /**
   * Verify a user's email address using the provided verification token.
   * 
   * @param token - The verification token sent to the user's email.
   * @returns A Promise that resolves to true if the email was successfully verified, false otherwise.
   */
  async verifyEmail(token: string): Promise<boolean> {
    try {
      // Find the verification record in the database using the provided token
      const verification = await Verification.findOne({
        token,
        type: VerificationType.EMAIL,
        expires: { $gt: new Date() }
      });

      if (!verification) {
        // Log a warning if the verification token is invalid or expired
        logger.warn('Invalid or expired email verification token');
        return false;
      }

      // Find the user associated with the verification token
      const user = await User.findById(verification.userId);
      if (!user) {
        // Log an error if the user is not found
        logger.error(`User not found for verification token: ${token}`);
        return false;
      }

      // Update the user's verification status to verified
      user.isVerified = true;
      await user.save();

      // Delete the verification record from the database
      await Verification.deleteOne({ _id: verification._id });

      // Log the successful user verification
      logger.info(`User verified: ${user.username}`);
      return true;
    } catch (error) {
      // Log any errors that occur during the email verification process
      logger.error('Email verification error:', error);
      return false;
    }
  }

  /**
   * Resend a verification code to the user's email address.
   * 
   * @param email - The email address of the user requesting a new verification code.
   * @returns A Promise that resolves to true if the verification code was successfully resent, false otherwise.
   */
  async resendVerificationCode(email: string): Promise<boolean> {
    try {
      // Find the user in the database using the provided email
      const user = await User.findOne({ email });
      if (!user) {
        // Log a warning if the email does not exist in the database
        logger.warn(`Resend verification requested for non-existent email: ${email}`);
        return false;
      }

      if (user.isVerified) {
        // Log a warning if the user is already verified
        logger.warn(`Resend verification requested for already verified user: ${user.username}`);
        return false;
      }

      // Delete any existing verification codes for this user
      await Verification.deleteMany({
        userId: user._id,
        type: VerificationType.EMAIL
      });

      // Generate a new random 3-character verification token
      const token = crypto.randomBytes(3).toString('hex').toUpperCase();
      
      // Set the expiration time for the new verification token
      const expiresIn = process.env.VERIFICATION_CODE_EXPIRES_IN || '15m';
      const expiresInMs = expiresIn.endsWith('h')
        ? parseInt(expiresIn) * 60 * 60 * 1000
        : parseInt(expiresIn) * 60 * 1000;

      // Save the new verification token in the database
      await Verification.create({
        userId: user._id,
        type: VerificationType.EMAIL,
        token,
        expires: new Date(Date.now() + expiresInMs)
      });

      // Send a new verification email to the user with the generated token
      const emailSent = await emailService.sendVerificationEmail(
        user.email,
        user.username,
        token
      );

      if (!emailSent) {
        // Log an error if the verification email fails to send
        logger.error(`Failed to send verification email to ${email}`);
        return false;
      }

      // Log the successful resending of the verification code
      logger.info(`Verification code resent to user: ${user.username}`);
      return true;
    } catch (error) {
      // Log any errors that occur during the resend verification process
      logger.error('Resend verification error:', error);
      return false;
    }
  }

  /**
   * Authenticate a user and generate access and refresh tokens.
   * 
   * @param usernameOrEmail - The username or email of the user attempting to log in.
   * @param password - The password provided by the user.
   * @returns A Promise that resolves to a LoginResult object indicating the success or failure of the login attempt.
   */
  async login(usernameOrEmail: string, password: string): Promise<LoginResult> {
    try {
      // Find the user in the database using either their username or email
      const user = await User.findOne({
        $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
      });

      if (!user) {
        return { success: false, message: 'Invalid credentials' };
      }

      // Check if the user's email has been verified
      if (!user.isVerified) {
        return { success: false, message: 'Email not verified' };
      }

      // Verify the provided password against the stored hash
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return { success: false, message: 'Invalid credentials' };
      }

      // Generate an access token for the user
      const accessToken = tokenService.generateAccessToken(
        user._id.toString(),
        user.username
      );
      
      // Generate a refresh token for the user and store it in the database
      const refreshToken = await tokenService.generateRefreshToken(
        user._id.toString(),
        user.username
      );

      // Log the successful user login
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
      // Log any errors that occur during the login process
      logger.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  }

  /**
   * Refresh an access token using a valid refresh token.
   * 
   * @param refreshToken - The refresh token provided by the user.
   * @returns A Promise that resolves to a TokenRefreshResult object indicating the success or failure of the token refresh.
   */
  async refreshToken(refreshToken: string): Promise<TokenRefreshResult> {
    try {
      // Verify the provided refresh token
      const decoded = await tokenService.verifyRefreshToken(refreshToken);
      
      if (!decoded) {
        return { success: false, message: 'Invalid refresh token' };
      }
      
      // Generate a new access token using the decoded user information
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
      // Log any errors that occur during the token refresh process
      logger.error('Token refresh error:', error);
      return { success: false, message: 'Token refresh failed' };
    }
  }

  /**
   * Log out a user by deleting their refresh token.
   * 
   * @param refreshToken - The refresh token to be deleted.
   * @returns A Promise that resolves to true if the logout was successful, false otherwise.
   */
  async logout(refreshToken: string): Promise<boolean> {
    try {
      // Delete the provided refresh token from the database
      return await tokenService.deleteRefreshToken(refreshToken);
    } catch (error) {
      // Log any errors that occur during the logout process
      logger.error('Logout error:', error);
      return false;
    }
  }

  /**
   * Log out a user from all devices by deleting all their refresh tokens.
   * 
   * @param userId - The unique identifier of the user to be logged out from all devices.
   * @returns A Promise that resolves to true if the logout was successful, false otherwise.
   */
  async logoutAll(userId: string): Promise<boolean> {
    try {
      // Delete all refresh tokens associated with the provided user ID
      return await tokenService.deleteAllUserRefreshTokens(userId);
    } catch (error) {
      // Log any errors that occur during the logout all process
      logger.error('Logout all error:', error);
      return false;
    }
  }
}

export const authService = new AuthService();
