import type { Server as HTTPServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import Message from '../models/message.model';
import User from '../models/user.model';
import { auth } from '../utils/auth';

const onlineUsers = new Map<string, string>(); // userId → socketId

const WSConnection = (server: HTTPServer) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', async (socket: Socket) => {
    try {
      // === Get session ===
      const session = await auth.api.getSession({
        headers: socket.handshake.headers,
      });

      const userId = session?.user.id;
      if (!userId) {
        socket.disconnect();
        return;
      }

      // === Join user room ===
      socket.join(userId);
      onlineUsers.set(userId, socket.id);
      await User.findByIdAndUpdate(userId, { isOnline: true });



      // === Notify others user is online ===
      io.emit('users_online', Array.from(onlineUsers.keys()));

      // === Send current online users to this client ===
      socket.emit('online_users', Array.from(onlineUsers.keys()));

      // === Private Message ===
      socket.on(
        'private_message',
        async ({ receiverId, message }, callback) => {
          try {
            if (!receiverId || !message) {
              if (typeof callback === 'function') {
                callback({
                  delivered: false,
                  error: 'Missing receiverId or message',
                });
              }
              return;
            }

            // Save message
            const newMessage = await Message.create({
              sender: userId,
              receiver: receiverId,
              content: message,
            });
            await newMessage.populate('sender', 'name image');
            await newMessage.populate('receiver', 'name image');

            // Send to receiver (using room instead of socketId)
            io.to(receiverId).emit('private_message', {
              message: newMessage,
            });

            // Send confirmation to sender
            socket.emit('message_sent', {
              message: newMessage,
            });

            // === Message delivery confirmation ===
            if (typeof callback === 'function') {
              callback({ delivered: true, messageId: newMessage._id });
            }
          } catch (error: any) {
            if (typeof callback === 'function') {
              callback({ delivered: false, error: error.message });
            }
          }
        }
      );

      // === Typing indicator (FIXED: consolidated both events) ===
      socket.on('typing', ({ receiverId, isTyping }) => {
        if (!receiverId) return;

        // Emit to receiver's room
        io.to(receiverId).emit('user_typing', {
          userId: userId,
          isTyping: isTyping,
        });
      });

      // === Mark messages as read ===
      socket.on('mark_read', async (data) => {
        try {
          if (!data.senderId) return;

          await Message.updateMany(
            { sender: data.senderId, receiver: userId, read: false },
            { read: true, readAt: new Date() }
          );

          // Notify sender their messages were read
          io.to(data.senderId).emit('messages_read', {
            readBy: userId,
          });
        } catch (error: any) {
          socket.emit('error', { message: error.message });
        }
      });

      // === Disconnect ===
      socket.on('disconnect', async () => {
        try {
          onlineUsers.delete(userId);

          // Update user status in database
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          });

          // Notify all clients this user is offline
          io.emit('users_online', Array.from(onlineUsers.keys()));

          // Also emit specific user offline event
          io.emit('user_offline', { userId });


        } catch (error) {

        }
      });
    } catch (err) {
      socket.disconnect();
    }
  });

  return io;
};

export default WSConnection;
