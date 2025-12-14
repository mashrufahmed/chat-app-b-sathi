import mongoose from 'mongoose';

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
