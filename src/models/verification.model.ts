// src/models/verification.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export enum VerificationType {
  EMAIL = 'email',
  PASSWORD_RESET = 'password-reset'
}

export interface IVerification extends Document {
  userId: mongoose.Types.ObjectId;
  type: VerificationType;
  token: string;
  expires: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VerificationSchema = new Schema<IVerification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: Object.values(VerificationType),
      required: true
    },
    token: {
      type: String,
      required: true
    },
    expires: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Index to automatically remove expired verifications
VerificationSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

export const Verification = mongoose.model<IVerification>('Verification', VerificationSchema);