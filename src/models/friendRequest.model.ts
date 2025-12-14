import mongoose, { Schema } from 'mongoose';

const friendRequestSchema = new mongoose.Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'block', 'unblock'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);
export default FriendRequest;
