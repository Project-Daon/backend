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
  weather: number;
  title: string;
  content: string;
};

router.get(
  '/',
  authMiddleware,
  async (req: RequestWithUserId, res: Response) => {
    let date: string =
      (req.query.date as string) || new Date().toISOString().split('T')[0];

    if (/^\d{6}$/.test(date)) {
      const year = date.slice(0, 4);
      const month = date.slice(4, 6);
      date = `${year}-${month}%`;
    } else if (/^\d{8}$/.test(date)) {
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

      console.log(req.userId, date);

      let query = 'SELECT * FROM diary WHERE user_id = ? AND date LIKE ?';
      switch (date) {
        case 'week':
          query = 'SELECT * FROM diary WHERE user_id = ? AND date >= ?';
          break;
        case 'month':
          query = 'SELECT * FROM diary WHERE user_id = ? AND date >= ?';
          break;
        case 'year':
          query = 'SELECT * FROM diary WHERE user_id = ? AND date >= ?';
          break;
      }

      const [diarys] = await connection.query(query, [req.userId, date]);

      const diaries: Table_Diary[] = diarys as Table_Diary[];

      if (diaries.length === 0) {
        return res.status(200).json({
          status: 200,
          msg: '검색된 일기가 없습니다',
        });
      } else if (diaries.length == 1) {
        return res.status(200).json({
          status: 200,
          title: diaries[0].title,
          content: diaries[0].content,
          feel: diaries[0].feel,
          weather: diaries[0].weather,
          date: diaries[0].date.replaceAll('-', ''),
          results: {
            title: diaries[0].title,
            content: diaries[0].content,
            feel: diaries[0].feel,
            weather: diaries[0].weather,
            date: diaries[0].date.replaceAll('-', ''),
          },
        });
      } else {
        return res.status(200).json({
          status: 200,
          results: diaries.map((diary) => {
            return {
              title: diary.title,
              content: diary.content,
              feel: diary.feel,
              weather: diary.weather,
              date: diary.date.replaceAll('-', ''),
            };
          }),
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
    const { title, content, feel, weather } = await req.body;
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
        'SELECT * FROM diary WHERE user_id = ? AND date = ?',
        [req.userId, formattedDate],
      );
      const diary: Table_Diary = (diarys as Table_Diary[])[0];

      if (diary) {
        await connection.execute(
          'UPDATE diary SET feel = ?, weather = ?, title = ?, content = ? WHERE user_id = ? AND date = ?',
          [feel, weather, title, content, req.userId, formattedDate], // Pass the actual values here
        );
      } else {
        await connection.execute(
          'INSERT INTO diary (user_id, date, feel, weather, title, content) VALUES (?, ?, ?, ?, ?, ?)',
          [req.userId, formattedDate, feel, weather, title, content],
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
