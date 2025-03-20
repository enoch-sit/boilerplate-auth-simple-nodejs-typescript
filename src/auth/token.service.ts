// src/auth/token.service.ts
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { Token } from '../models/token.model';
import { Types } from 'mongoose';
import { logger } from '../utils/logger';

export interface TokenPayload {
  sub: string;
  username: string;
  type: 'access' | 'refresh';
}

export class TokenService {
  /**
   * Generate access token
   */
  generateAccessToken(userId: string, username: string): string {
    const secretString = process.env.JWT_ACCESS_SECRET || 'access_secret';
    const secret = Buffer.from(secretString, 'utf8');
    const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    
    const payload: TokenPayload = { sub: userId, username, type: 'access' };
    const options = { expiresIn } as jwt.SignOptions;
    
    return jwt.sign(payload, secret, options);
  }

  /**
   * Generate refresh token and store it
   */
  async generateRefreshToken(userId: string, username: string): Promise<string> {
    const secretString = process.env.JWT_REFRESH_SECRET || 'refresh_secret';
    const secret = Buffer.from(secretString, 'utf8');
    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    
    // Calculate expiry date
    const expiresInMs = expiresIn.endsWith('d')
      ? parseInt(expiresIn) * 24 * 60 * 60 * 1000
      : parseInt(expiresIn) * 60 * 1000;
    
    const expires = new Date(Date.now() + expiresInMs);
    
    // Generate token
    const payload: TokenPayload = { sub: userId, username, type: 'refresh' };
    const options = { expiresIn } as jwt.SignOptions;
    
    const refreshToken = jwt.sign(payload, secret, options);
    
    // Store token in database
    await Token.create({
      userId: new Types.ObjectId(userId),
      refreshToken,
      expires
    });
    
    return refreshToken;
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const secretString = process.env.JWT_ACCESS_SECRET || 'access_secret';
      const secret = Buffer.from(secretString, 'utf8');
      const decoded = jwt.verify(token, secret) as TokenPayload;
      
      if (decoded.type !== 'access') {
        return null;
      }
      
      return decoded;
    } catch (error) {
      logger.error('Access token verification error:', error);
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<TokenPayload | null> {
    try {
      const secretString = process.env.JWT_REFRESH_SECRET || 'refresh_secret';
      const secret = Buffer.from(secretString, 'utf8');
      const decoded = jwt.verify(token, secret) as TokenPayload;
      
      if (decoded.type !== 'refresh') {
        return null;
      }
      
      // Check if token exists in database and is valid
      const tokenRecord = await Token.findOne({
        userId: new Types.ObjectId(decoded.sub),
        refreshToken: token,
        expires: { $gt: new Date() }
      });
      
      if (!tokenRecord) {
        return null;
      }
      
      return decoded;
    } catch (error) {
      logger.error('Refresh token verification error:', error);
      return null;
    }
  }

  /**
   * Delete refresh token
   */
  async deleteRefreshToken(token: string): Promise<boolean> {
    try {
      const result = await Token.deleteOne({ refreshToken: token });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Delete refresh token error:', error);
      return false;
    }
  }

  /**
   * Delete all refresh tokens for a user
   */
  async deleteAllUserRefreshTokens(userId: string): Promise<boolean> {
    try {
      const result = await Token.deleteMany({ userId: new Types.ObjectId(userId) });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Delete all refresh tokens error:', error);
      return false;
    }
  }
}

export const tokenService = new TokenService();
