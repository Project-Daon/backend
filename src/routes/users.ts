import express, { Request, Response } from 'express';
import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { authMiddleware } from './middleware/auth';

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

interface RequestWithUserId extends Request {
  userId?: string;
}

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

type Table_OAuth = {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  provider: string;
  provider_id: string;
  access_expired_at: Date;
  refresh_expired_at: Date;
  access_created_at: Date;
  logined_at: Date;
};

type Table_Diary = {
  userid: string;
  date: string;
  feel: number;
  weather: number;
  title: string;
  content: string;
};

router.get(
  '/@me',
  authMiddleware,
  async (req: RequestWithUserId, res: Response) => {
    const connection = await pool.getConnection();

    try {
      const [accounts] = await connection.query(
        'SELECT * FROM users WHERE id = ?',
        [req.userId],
      );
      const account: Table_Users = (accounts as Table_Users[])[0];

      const [diarys] = await connection.query(
        'SELECT * FROM diary WHERE user_id = ? AND date = ?',
        [req.userId, new Date().toISOString().split('T')[0]],
      );
      const diary: Table_Diary = (diarys as Table_Diary[])[0];

      if (!account) {
        return res.status(500).json({
          code: 'NOT_FOUND',
          message: '유저를 찾을 수 없습니다',
        });
      }

      if (!account.oauth) {
        return res.status(200).json({
          id: account.id,
          username: account.username,
          nickname: account.nickname,
          email: account.email,
          provider: 'self-hosted',
          disabled: false,
          cash: account.cash,
          today: diary !== undefined,
        });
      } else {
        const [oauth] = await connection.query(
          'SELECT * FROM oauth WHERE user_id = ?',
          [account.id],
        );
        const oauthData: Table_OAuth = (oauth as Table_OAuth[])[0];
        switch (oauthData.provider) {
          case 'google':
            return res.status(200).json({
              provider: 'google',
              userid: account.id,
              username: account.username,
              email: account.email,
              google: oauthData.provider_id,
              cash: account.cash,
              today: diary !== undefined,
            });
          case 'naver':
            return res.status(200).json({
              provider: 'naver',
              userid: account.id,
              username: account.username,
              email: account.email,
              naver: oauthData.provider_id,
              cash: account.cash,
              today: diary !== undefined,
            });
          case 'kakao':
            return res.status(200).json({
              provider: 'kakao',
              userid: account.id,
              username: account.username,
              email: account.email,
              kakao: oauthData.provider_id,
              cash: account.cash,
              today: diary !== undefined,
            });
          default:
            return res.status(200).json({
              id: account.id,
              username: account.username,
              nickname: account.nickname,
              email: account.email,
              provider: 'self-hosted',
              disabled: false,
              cash: account.cash,
              today: diary !== undefined,
            });
        }
      }
    } catch (e) {
      return res.status(500).json({
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 내부 오류',
        error: e,
      });
    } finally {
      connection.release();
    }
  },
);

router.put(
  '/@me',
  authMiddleware,
  async (req: RequestWithUserId, res: Response) => {
    const { email, nickname, cash } = req.params;
    const connection = await pool.getConnection();

    try {
      let query = 'UPDATE users SET ';

      if (email) query += 'email = ?, ';
      if (nickname) query += 'nickname = ?, ';
      if (cash) query += 'cash = ?, ';

      query = query.slice(0, -2);

      query += ' WHERE id = ?';

      await connection.query(query, [email, nickname, cash, req.userId]);
      return res.status(200).json({
        code: 'SUCCESS',
        message: '정보가 변경되었습니다',
      });
    } catch (e) {
      return res.status(500).json({
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 내부 오류',
        error: e,
      });
    } finally {
      connection.release();
    }
  },
)

export default router;
