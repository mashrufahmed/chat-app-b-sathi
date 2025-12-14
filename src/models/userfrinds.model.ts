import mongoose, { Schema } from 'mongoose';

const userFriendSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    friends: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const UserFriend = mongoose.model('UserFriend', userFriendSchema);
export default UserFriend;
