import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import mysql from 'mysql2/promise';

const router = express.Router();

const pool = mysql.createPool({
  connectTimeout: 60000,
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT as string),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

router.get('/', async function (req, res) {
  const api_url = 'https://nid.naver.com/oauth2.0/authorize';
  const redirect_uri = process.env.OAUTH_NAVER_REDIRECT_URI || '';
  const state = uuidv4();

  res.redirect(
    `${api_url}?response_type=code&client_id=${process.env.OAUTH_NAVER_CLIENT_ID}&redirect_uri=${redirect_uri}&state=${state}`,
  );
});

router.get('/callback', async function (req, res) {
  const code = req.query.code;
  const state = req.query.state;

  const api_url = 'https://nid.naver.com/oauth2.0/token';

  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('client_id', process.env.OAUTH_NAVER_CLIENT_ID || '');
  params.append('client_secret', process.env.OAUTH_NAVER_CLIENT_SECRET || '');
  params.append('redirect_uri', process.env.OAUTH_NAVER_REDIRECT_URI || '');
  params.append('code', code as string);
  params.append('state', state as string);

  await fetch(`${api_url}?${params.toString()}`)
    .then((res) => res.json())
    .then(async (tokenData) => {
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;
      const tokenType = tokenData.token_type;
      const expiresIn = tokenData.expires_in;

      // TODO: Save the token data to the database
      // TODO: Add Login session(access_token) to res cookie

      // {
      //   access_token: 'AAAAO9yNL3DP6EHCMM7CFGeZVcfeziYvQjzYIzSOr4ABHwn-_5fUIiaZr30KqpAKZWqJf_7D-R6MtlS_dH87FBzmab8',
      //   refresh_token: 'sJjwOaipKkxj0fAOJJkbiiRoLMsP9NNgbY8DipFcUSU7NxyweScVZ5o0ZeRbbAWrrpKPRBDQ0oTqC5Mmc0Jg4L9bisipY4WXl0dOW9JzlipAYJiiwlxDy6eklXXjlHsoWQVUpipI',
      //   token_type: 'bearer',
      //   expires_in: '3600'
      // }
    });
});

export default router;
