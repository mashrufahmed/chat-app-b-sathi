import type { NextFunction, Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Chat from '../models/chat.model';
import FriendRequest from '../models/friendRequest.model';
import Message from '../models/message.model';
import User from '../models/user.model';
import UserFriend from '../models/userfrinds.model';
import { auth } from '../utils/auth';

export const getAllUsers = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const getUsers = await User.find({});
    res.json(getUsers);
  }
);

// Send Friend Request
export const sendFriendRequest = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    //  GTE Login User Session
    const session = await auth.api.getSession({
      headers: req.headers,
    });
    const { receiverId } = req.body;
    // if session not found
    if (!session) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    // find User Friends Collection All Ready Exist
    let exitUserFriends = await UserFriend.findOne({
      userId: session.user.id,
    });
    // if User Friends Collection not found
    if (!exitUserFriends) {
      exitUserFriends = await UserFriend.create({ userId: session.user.id });
    }
    // find friend all ready Exist friend Collection. if does not exist
    if (!exitUserFriends.friends.includes(receiverId)) {
      const exitingFriendRequest = await FriendRequest.findOne({
        sender: session.user.id,
        receiver: receiverId,
      });
      if (!exitingFriendRequest) {
        const friendRequest = await FriendRequest.create({
          sender: session.user.id,
          receiver: receiverId,
        });
        res.status(200).json({
          status: friendRequest.status,
          message: 'Friend request sent successfully',
        });
      } else {
        res.status(200).json({
          status: exitingFriendRequest.status,
          message: 'Friend request already sent',
        });
      }
    }
  }
);

// Handle All Friend Request {Accept, Reject, Cancel, Unfriend, Block, Unblock}
export const handleAllFriendRequest = expressAsyncHandler(
  async (req: Request, res: Response) => {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { userStatus } = req.body;
    const requestId = req.params.id;

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      res.status(404).json({ message: 'Friend request not found' });
      return;
    }

    switch (userStatus) {
      case 'reject':
        await request.deleteOne();
        res.status(200).json({ message: 'Friend request rejected' });
        return;

      case 'cancel':
        await request.deleteOne();
        res.status(200).json({ message: 'Friend request canceled' });
        return;

      case 'unfriend':
        await Promise.all([
          UserFriend.updateOne(
            { userId: session.user.id },
            { $pull: { friends: request.receiver } }
          ),
          UserFriend.updateOne(
            { userId: request.receiver },
            { $pull: { friends: session.user.id } }
          ),
          Chat.deleteOne({ members: [session.user.id, request.receiver] }),
        ]);
        await request.deleteOne();
        res.status(200).json({ message: 'Unfriended successfully' });
        return;

      case 'block':
        request.status = 'block';
        await request.save();
        res.status(200).json({ message: 'Blocked successfully' });
        return;

      case 'unblock':
        request.status = 'unblock';
        await request.save();
        res.status(200).json({ message: 'Unblocked successfully' });
        return;
      case 'accept':
        request.status = 'accepted';
        await request.save();

        await Promise.all([
          UserFriend.updateOne(
            { userId: request.sender },
            { $addToSet: { friends: request.receiver } },
            { upsert: true }
          ),
          UserFriend.updateOne(
            { userId: request.receiver },
            { $addToSet: { friends: request.sender } },
            { upsert: true }
          ),
          Chat.create({
            userId: session.user.id,
            members: [request.sender, request.receiver],
          }),
        ]);
        res.status(200).json({ message: 'Friend request accepted' });
        return;
      default:
        res.status(400).json({ message: 'Invalid userStatus value' });
        return;
    }
  }
);

export const getAUser = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const user = await User.findOne({ id });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.status(200).json(user);
  }
);

export const searchUser = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await auth.api.getSession({ headers: req.headers });
    let { name } = req.query;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ message: 'Name query is required' });
      return;
    }

    // Trim spaces at start/end and replace multiple spaces with \s+ regex
    name = name.trim().replace(/\s+/g, '\\s+');
    const currentUserID = new mongoose.Types.ObjectId(session?.user.id);
    const users = await User.aggregate([
      {
        $match: {
          name: { $regex: name, $options: 'i' },
          _id: { $ne: currentUserID },
        },
      },
      {
        $lookup: {
          from: 'friendrequests',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    {
                      $and: [
                        { $eq: ['$sender', currentUserID] },
                        { $eq: ['$receiver', '$$userId'] },
                      ],
                    },
                    {
                      $and: [
                        { $eq: ['$sender', '$$userId'] },
                        { $eq: ['$receiver', currentUserID] },
                      ],
                    },
                  ],
                },
              },
            },
            { $project: { _id: 0, status: 1 } }, // only return the status
          ],
          as: 'friendRequestStatus',
        },
      },
      {
        $addFields: {
          friendStatus: { $arrayElemAt: ['$friendRequestStatus.status', 0] }, // get single value
        },
      },
      {
        $project: { friendRequestStatus: 0 }, // remove the array
      },
    ]);

    const modifiedUsers = users.filter(
      (user) => user.email !== session?.user.email
    );

    res.status(200).json(modifiedUsers);
  }
);

export const getAllMessages = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const getChat = await Chat.findOne({ userId: session.user.id });
    const messages = await Message.find({ chat: getChat?._id });
    res.json(messages);
  }
);

export const getAllFriendRequest = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const friendRequests = await FriendRequest.find({
      sender: session.user.id,
    }).populate('receiver', '_id name email image');
    res.status(200).json(friendRequests);
  }
);

export const getIncomingFriendRequest = expressAsyncHandler(
  async (req, res) => {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const incoming = await FriendRequest.find({
      receiver: session.user.id,
      status: 'pending',
    }).populate('sender', '_id name email image');

    res.status(200).json(incoming);
  }
);

export const getOwnFriends = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const friends = await UserFriend.findOne({
      userId: session.user.id,
    }).populate('friends', '_id name email image createdAt');
    res.status(200).json(friends);
  }
);

export const getUserById = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId as string)) {
      res.status(400).json({ message: 'Invalid user ID' });
      return;
    }

    const user = await User.findById(userId).select(
      '_id name email image isOnline lastSeen'
    );

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json(user);
  }
);

export const getMessagesBetweenUsers = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { friendId } = req.params;
    const currentUserId = session.user.id;

    if (!mongoose.Types.ObjectId.isValid(friendId as string)) {
      res.status(400).json({ message: 'Invalid friend ID' });
      return;
    }

    try {
      const messages = await Message.find({
        $or: [
          { sender: currentUserId, receiver: friendId },
          { sender: friendId, receiver: currentUserId },
        ],
      })
        .populate('sender', '_id name email image')
        .populate('receiver', '_id name email image')
        .sort({ createdAt: 1 });

      res.status(200).json(messages);
    } catch (error) {

      res.status(500).json({ message: 'Error fetching messages' });
    }
  }
);

export const markMessagesAsRead = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { friendId } = req.params;
    const currentUserId = session.user.id;

    if (!mongoose.Types.ObjectId.isValid(friendId as string)) {
      res.status(400).json({ message: 'Invalid friend ID' });
      return;
    }

    try {
      const result = await Message.updateMany(
        {
          sender: friendId,
          receiver: currentUserId,
          read: false,
        },
        {
          read: true,
          readAt: new Date(),
        }
      );

      res.status(200).json({
        success: true,
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {

      res.status(500).json({ message: 'Error marking messages as read' });
    }
  }
);
