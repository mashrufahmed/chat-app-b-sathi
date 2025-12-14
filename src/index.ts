import 'dotenv/config';
import { createServer } from 'node:http';
import app from './app';
import { connectDB } from './config/dbConnect';
import WSConnection from './config/socketConfig';

const startServer = async () => {
  const server = createServer(app);
  WSConnection(server);
  const PORT = process.env.PORT;
  await connectDB();
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
