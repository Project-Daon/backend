import express, { Request } from 'express';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

config();

const router = express.Router();

const pool = mysql.createPool({
  connectTimeout: 60000,
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT as string),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

type Table_Users = {
  id: string;
  username: string;
  nickname: string;
  oauth: boolean;
  oauthId: string;
  email: string;
  password: string;
  created_at: Date;
  cash: number;
};

router.get('/', async function (req, res) {
  return res.status(200).json({ message: 'Auth Router is working' });
});

router.post('/register', async function (req, res) {
  const { email = req.body.id, password } = await req.body;
  const nickname = req.body.nickname || '다온';

  // const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  // const nicknameRegex = /^[a-zA-Z0-9._+-]$/;
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)|(?=.*[a-z])(?=.*[!@#$%^&*(),.?":{}|<>])(?=.*\d)|(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])(?=.*\d)[\w!@#$%^&*(),.?":{}|<>]{8,}$/;

  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      code: 'INVALID_PASSWORD',
      message: '비밀번호 형식이 올바르지 않습니다',
    });
  }

  const connection = await pool.getConnection();
  const saltRound = 10;
  const salt = await bcrypt.genSalt(saltRound);
  const hash = await bcrypt.hash(password, salt);

  try {
    const [rows] = await connection.execute(
      'INSERT INTO users (id, username, nickname, oauth, email, password) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), email, nickname, false, email, hash],
    );

    connection.release();

    return res.status(200).json({
      code: 'SUCCESS',
      message: '회원가입에 성공했습니다',
    });
  } catch (error) {
    return res.status(500).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: '서버 내부 오류',
    });
  }
});

router.post('/login', async function (req, res) {
  const { email = req.body.id, password }: any = await req.body;

  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.query(
      'SELECT * FROM users WHERE email = ?',
      [email],
    );

    const user: Table_Users = (rows as Table_Users[])[0];

    if (!user) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: '가입되지 않은 이메일입니다',
      });
    }

    const compare = await bcrypt.compare(password, user.password);

    if (!compare) {
      return res.status(401).json({
        code: 'INVALID_PASSWORD',
        message: '비밀번호가 일치하지 않습니다',
      });
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' },
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '14d' },
    );

    await connection.query(
      'INSERT INTO refreshs (token, id, expired) VALUES (?, ?, ?)',
      [refreshToken, user.id, new Date(Date.now() + 1209600000 - 5)], // 쿠키 만료 시간 오차범위
    );

    connection.release();

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: '.daon.today',
      maxAge: 3600000, // 1 hour
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: '.daon.today',
      maxAge: 1209600000, // 14 days
    });

    return res.status(200).json({
      code: 'SUCCESS',
      message: '로그인에 성공했습니다',
      accessToken,
      refreshToken,
    });
  } catch (error) {
    return res.status(500).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: '서버 내부 오류',
    });
  }
});

router.post('/authorize', async function (req: Request, res: express.Response) {
  const { access_token, refresh_token } = req.cookies;
  let accessToken: string = 'success';
  let refreshToken: string = 'success';

  if (access_token) {
    try {
      jwt.verify(access_token, process.env.JWT_SECRET as string);
    } catch (err) {
      const error = err as Error;
      if (error.name === 'JsonWebTokenError') {
        accessToken = 'incorrect';
      } else if (error.name === 'TokenExpiredError') {
        accessToken = 'expired';
      }
    }
  } else {
    accessToken = 'notfound';
  }

  if (refresh_token) {
    try {
      jwt.verify(refresh_token, process.env.JWT_SECRET as string);
    } catch (err) {
      const error = err as Error;
      if (error.name === 'JsonWebTokenError') {
        refreshToken = 'incorrect';
      } else if (error.name === 'TokenExpiredError') {
        refreshToken = 'expired';
      }
    }
  } else {
    refreshToken = 'notfound';
  }

  return res.status(200).json({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
});

export default router;
