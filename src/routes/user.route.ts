import { Router } from 'express';
import {
  getAllMessages,
  getAllUsers,
  getIncomingFriendRequest,
  getMessagesBetweenUsers,
  getOwnFriends,
  getUserById,
  handleAllFriendRequest,
  markMessagesAsRead,
  searchUser,
  sendFriendRequest,
} from '../controllers/user.controller';

const userRouter = Router();

userRouter.get('/get-users', getAllUsers);
userRouter.post('/handle-friend-request/:id', handleAllFriendRequest);
userRouter.post('/send-friend-request', sendFriendRequest);
userRouter.get('/get-all-messages', getAllMessages);
userRouter.get('/search-user', searchUser);
userRouter.get('/get-friend-request', getIncomingFriendRequest);
userRouter.get('/get-own-friends', getOwnFriends);
userRouter.get('/get-user/:userId', getUserById);
userRouter.get('/messages/:friendId', getMessagesBetweenUsers);
userRouter.post('/messages/mark-read/:friendId', markMessagesAsRead);

export default userRouter;
