import express from 'express';
import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { Request, Response } from 'express';
import { authMiddleware } from '@/middleware/auth';

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
  oauth: boolean;
  oauthId: string;
  email: string;
  password: string;
  created_at: Date;
};

type Table_Diary = {
  userid: string;
  date: string;
  feel: number;
  content: string;
};

router.get(
  '/',
  authMiddleware,
  async (req: RequestWithUserId, res: Response) => {
    const connection = await pool.getConnection();

    try {
      const [accounts] = await connection.query(
        'SELECT * FROM accounts WHERE id = ?',
        [req.userId],
      );
      const account: Table_Users = (accounts as Table_Users[])[0];

      if (!account) {
        return res.status(500).json({
          code: 'NOT_FOUND',
          message: '유저를 찾을 수 없습니다',
        });
      }

      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      const [diarys] = await connection.query(
        'SELECT * FROM DIARY_DAILY_DATA WHERE userid = ? AND date = ?',
        [req.userId, formattedDate],
      );

      const diary: Table_Diary = (diarys as Table_Diary[])[0];

      if (diary) {
        return res.status(200).json({
          status: 200,
          content: diary.content,
        });
      } else {
        return res.status(500).json({
          status: 500,
          msg: 'INTERNAL_SERVER_ERROR',
        });
      }
    } finally {
      connection.release();
    }
  },
);

router.post(
  '/',
  authMiddleware,
  async (req: RequestWithUserId, res: Response) => {
    const connection = await pool.getConnection();
    try {
      const [accounts] = await connection.query(
        'SELECT * FROM accounts WHERE id = ?',
        [req.userId],
      );
      const account: Table_Users = (accounts as Table_Users[])[0];

      if (!account) {
        return res.status(500).json({
          code: 'NOT_FOUND',
          message: '유저를 찾을 수 없습니다',
        });
      }

      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      // Insert into DIARY_DAILY_DATA if not exists else update
      await connection.execute(
        'INSERT INTO DIARY_DAILY_DATA (userid, date, feel, content) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE content = ?',
        [
          req.userId,
          formattedDate,
          req.body.feel as number,
          req.body.content as string,
        ],
      );
      const [diarys] = await connection.query(
        'SELECT * FROM DIARY_DAILY_DATA WHERE userid = ? AND date = ?',
        [req.userId, formattedDate],
      );

      const diary: Table_Diary = (diarys as Table_Diary[])[0];

      if (diary.content === req.body.content) {
        return res.status(200).json({
          status: 200,
          msg: 'TASK_SUCCESS',
        });
      } else {
        return res
          .status(500)
          .json({ status: 500, msg: 'INTERNAL_SERVER_ERROR' });
      }
    } finally {
      connection.release();
    }
  },
);

router.get(
  '/sdate',
  authMiddleware,
  async (req: RequestWithUserId, res: Response) => {
    const connection = await pool.getConnection();
    const formattedDate = req.query.date as string;

    try {
      const [accounts] = await connection.query(
        'SELECT * FROM accounts WHERE id = ?',
        [req.userId],
      );
      const account: Table_Users = (accounts as Table_Users[])[0];

      if (!account) {
        return res.status(500).json({
          code: 'NOT_FOUND',
          message: '유저를 찾을 수 없습니다',
        });
      }

      const [diarys] = await connection.query(
        'SELECT * FROM DIARY_DAILY_DATA WHERE userid = ? AND date = ?',
        [req.userId, formattedDate],
      );

      const diary: Table_Diary = (diarys as Table_Diary[])[0];

      if (diary) {
        return res.status(200).json({
          status: 200,
          content: diary.content,
        });
      } else {
        return res.status(500).json({
          status: 500,
          msg: 'INTERNAL_SERVER_ERROR',
        });
      }
    } finally {
      connection.release();
    }
  },
);

export default router;
