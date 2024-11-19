import mysql, { FieldPacket, RowDataPacket } from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';

import { NextFunction, Request, Response } from 'express';

config();

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

type Table_Refreshs = {
  token: string;
  id: string;
  expired: Date;
};

export const authMiddleware = async (
  req: RequestWithUserId,
  res: Response,
  next: NextFunction | any,
) => {
  let access_token = req.headers.authorization
    ? req.headers.authorization
    : req.cookies.access_token;

  const refresh_token: string | any = req.headers.refresh_token
    ? req.headers.refresh_token
    : req.cookies.refresh_token;

  if (!access_token && !refresh_token) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: '인증이 필요한 서비스입니다',
    });
  }

  if (access_token) {
    access_token = access_token.replace('Bearer ', '');
  }

  const connection = await pool.getConnection();
  if (!access_token) {
    try {
      jwt.verify(refresh_token, process.env.JWT_SECRET as string);
      const [rows]: [RowDataPacket[], FieldPacket[]] = await connection.execute(
        'SELECT * FROM refreshs WHERE token = ?',
        [refresh_token],
      );

      if (!rows[0]) {
        connection.release();
        return res.status(401).json({
          code: 'INVALID_TOKEN',
          message: '유효하지 않은 토큰입니다.',
        });
      } else {
        const data: Table_Refreshs = rows[0] as Table_Refreshs;
        const expired: number = new Date(data.expired).getTime();

        if (expired < Date.now()) {
          connection.release();
          return res.status(401).json({
            code: 'EXPIRED_TOKEN',
            message: '만료된 토큰입니다.',
          });
        } else {
          const iat = Math.floor(Date.now() / 1000);
          const accessExp = iat + 60 * 60 * 1; // second * minute * hour
          const newAccessToken = jwt.sign(
            { id: data.id },
            process.env.JWT_SECRET as string,
            {
              expiresIn: accessExp,
            },
          );
          res.cookie('access_token', newAccessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            domain: '.daon.today',
            maxAge: 3600000,
          });
          req.userId = data.id;
          connection.release();
          return next();
        }
      }
    } catch (e) {
      return res.status(401).json({
        code: 'INVALID_TOKEN',
        message: '유효하지 않은 토큰입니다.',
      });
    }
  } else {
    try {
      const data: any = jwt.verify(
        access_token,
        process.env.JWT_SECRET as string,
      );
      connection.release();
      req.userId = data.id;
      next();
    } catch (err) {
      const error = err as Error;
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          code: 'UNAUTHORIZED',
          message: '잘못된 토큰입니다',
        });
      } else if (error.name === 'TokenExpiredError') {
        try {
          const connection = await pool.getConnection();
          jwt.verify(refresh_token, process.env.JWT_SECRET as string);
          const [rows]: [RowDataPacket[], FieldPacket[]] =
            await connection.execute(
              'SELECT * FROM refreshs WHERE token = ?',
              refresh_token,
            );
          if (!rows[0]) {
            connection.release();
            return res.status(401).json({
              code: 'EXPIRED_TOKEN',
              message: '토큰이 만료되었습니다',
            });
          } else {
            const iat = Math.floor(Date.now() / 1000);
            const accessExp = iat + 60 * 60 * 1; // second * minute * hour
            const newAccessToken = jwt.sign(
              { id: rows[0].id },
              process.env.JWT_SECRET as string,
              {
                expiresIn: accessExp,
              },
            );
            res.cookie('access_token', newAccessToken, {
              httpOnly: true,
              secure: true,
              sameSite: 'none',
              domain: '.daon.today',
              maxAge: 3600,
            });
            req.userId = rows[0].id;
            connection.release();
            return next();
          }
        } catch (e) {
          console.error(e);
          return res.status(401).json({
            code: 'NEED_REFRESH',
            message: '토큰이 만료되었습니다',
          });
        } finally {
          connection.release();
        }
      } else {
        return res.status(401).json({
          code: 'UNAUTHORIZED',
          message: '잘못된 토큰입니다',
        });
      }
    }
  }
};
