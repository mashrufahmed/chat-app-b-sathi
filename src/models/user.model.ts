import type { Document } from 'mongodb';
import mongoose from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  emailVerified: boolean;
  image: string;
  isOnline: boolean;
  lastSeen: Date;
}

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    emailVerified: Boolean,
    image: String,
    isOnline: Boolean,
    lastSeen: Date,
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema, 'user'); // Better-Auth collection
export default User;
