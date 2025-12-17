import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import userRouter from './routes/user.route';
import { auth } from './utils/auth';
const app = express();

app.use(
  cors({
    origin: process.env.ORIGIN_URL?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  })
);

app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.send('Hello World!');
});
app.use('/api/users', userRouter);

export default app;
