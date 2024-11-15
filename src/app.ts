import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from 'dotenv';
import logger from 'morgan';
import helmet from 'helmet';
import indexRouter from './routes/index';
import diaryRouter from './routes/diary';
import userRouter from './routes/user';
import authRouter from './routes/auth';
import naverRouter from './routes/oauth/naver';
import kakaoRouter from './routes/oauth/kakao';

config();
const app = express();
app.set('port', process.env.PORT || 3001);
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(helmet());
app.use(
  cors({
    origin: [
      'https://daon.today',
      'https://app.daon.today',
      'http://localhost:5173',
    ],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }),
);

app.listen(app.get('port'), () => {
  console.log(`🚀 ProjectDaon API is running on port ${app.get('port')}`);
});

app.use('/', indexRouter);
app.use('/diary', diaryRouter);
app.use('/users', userRouter);
app.use('/', authRouter);
app.use('/login/naver', naverRouter);
app.use('/login/kakao', kakaoRouter);
