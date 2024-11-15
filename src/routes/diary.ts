import express from 'express';
import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { Request, Response } from 'express';
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
    let date: string = (req.query.date as string) || new Date().toISOString().split('T')[0];

    if (/^\d{8}$/.test(date)) {
      const year = date.slice(0, 4);
      const month = date.slice(4, 6);
      const day = date.slice(6, 8);
      date = `${year}-${month}-${day}`;
    }

    const connection = await pool.getConnection();

    try {
      const [accounts] = await connection.query(
        'SELECT * FROM users WHERE id = ?',
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
        'SELECT * FROM DIARY_Daily_Data WHERE user_id = ? AND date = ?',
        [req.userId, date],
      );

      const diary: Table_Diary = (diarys as Table_Diary[])[0];

      if (diary) {
        return res.status(200).json({
          status: 200,
          content: diary.content,
          feel: diary.feel,
          date: diary.date.replaceAll('-', ''),
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
  authMiddleware,
);

router.post(
  '/',
  authMiddleware,
  async (req: RequestWithUserId, res: Response) => {
    const { feel, content } = req.query;
    const connection = await pool.getConnection();
    try {
      const [accounts] = await connection.query(
        'SELECT * FROM users WHERE id = ?',
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
        'SELECT * FROM DIARY_Daily_Data WHERE user_id = ? AND date = ?',
        [req.userId, formattedDate],
      );
      const diary: Table_Diary = (diarys as Table_Diary[])[0];

      if (diary) {
        await connection.execute(
          'UPDATE DIARY_Daily_Data SET feel = ?, content = ? WHERE user_id = ? AND date = ?',
          [feel, content, req.userId, formattedDate] // Pass the actual values here
        );
      } else {
        await connection.execute(
          'INSERT INTO DIARY_Daily_Data (user_id, date, feel, content) VALUES (?, ?, ?, ?)',
          [req.userId, formattedDate, feel, content],
        );
      }

      return res.status(200).json({
        status: 200,
        msg: 'TASK_SUCCESS',
      });
    } finally {
      connection.release();
    }
  },
);

export default router;
