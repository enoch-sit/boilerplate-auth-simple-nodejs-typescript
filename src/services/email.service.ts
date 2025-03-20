// src/services/email.service.ts
import nodemailer from 'nodemailer';
import { getEmailTransporter } from '../config/email.config';
import { logger } from '../utils/logger';

export class EmailService {
  /**
   * Send verification email with code
   */
  async sendVerificationEmail(
    email: string,
    username: string,
    verificationCode: string
  ): Promise<boolean> {
    try {
      const transporter = getEmailTransporter();
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        to: email,
        subject: 'Verify Your Email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hello ${username},</h2>
            <p>Thank you for registering. Please use the following code to verify your email address:</p>
            <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
              ${verificationCode}
            </div>
            <p>This code will expire in 15 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <p>Best regards,<br>The Team</p>
          </div>
        `
      };
      
      await transporter.sendMail(mailOptions);
      logger.info(`Verification email sent to ${email}`);
      return true;
    } catch (error) {
      logger.error('Error sending verification email:', error);
      return false;
    }
  }

  /**
   * Send password reset email with token
   */
  async sendPasswordResetEmail(
    email: string,
    username: string,
    resetToken: string
  ): Promise<boolean> {
    try {
      const transporter = getEmailTransporter();
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        to: email,
        subject: 'Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hello ${username},</h2>
            <p>We received a request to reset your password. Click the button below to reset it:</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p>${resetLink}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
            <p>Best regards,<br>The Team</p>
          </div>
        `
      };
      
      await transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      logger.error('Error sending password reset email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
