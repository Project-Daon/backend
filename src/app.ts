import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from 'dotenv';
import logger from 'morgan';
import helmet from 'helmet';

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
    origin: ['https://daon.today/'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }),
);

app.listen(app.get('port'), () => {
  console.log(`🚀 ProjectDaon API is running on port ${app.get('port')}`);
});

import indexRouter from './routes/index';
import naverRouter from './routes/oauth/naver';
import kakaoRouter from './routes/oauth/kakao';
app.use('/', indexRouter);
app.use('/login/naver', naverRouter);
app.use('/login/kakao', kakaoRouter);