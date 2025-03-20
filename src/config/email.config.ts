// src/config/email.config.ts
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface EmailConfig {
  service: string;
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

let transporter: nodemailer.Transporter;

export const initializeEmailTransporter = (): void => {
  try {
    const config: EmailConfig = {
      service: process.env.EMAIL_SERVICE || 'smtp',
      host: process.env.EMAIL_HOST || 'localhost',
      port: parseInt(process.env.EMAIL_PORT || '1025', 10),
      secure: process.env.NODE_ENV === 'production',
      auth: {
        user: process.env.EMAIL_USER || 'test',
        pass: process.env.EMAIL_PASS || 'test'
      }
    };

    // Special case for development - using MailHog or other local SMTP server
    if (process.env.NODE_ENV === 'development') {
      transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: false,
        auth: {
          user: config.auth.user,
          pass: config.auth.pass
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      logger.info('Email service initialized in development mode');
      return;
    }

    // Production setup
    transporter = nodemailer.createTransport({
      service: config.service,
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass
      }
    });

    logger.info('Email service initialized in production mode');
  } catch (error) {
    logger.error('Email service initialization error:', error);
    process.exit(1);
  }
};

export const getEmailTransporter = (): nodemailer.Transporter => {
  if (!transporter) {
    throw new Error('Email transporter not initialized');
  }
  return transporter;
};