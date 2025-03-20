// src/models/token.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IToken extends Document {
  userId: mongoose.Types.ObjectId;
  refreshToken: string;
  expires: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TokenSchema = new Schema<IToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    refreshToken: {
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

// Index to automatically remove expired tokens
TokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

export const Token = mongoose.model<IToken>('Token', TokenSchema);