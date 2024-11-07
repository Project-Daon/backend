import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import mysql from "mysql2/promise";

const router = express.Router();

router.get('/', async function (req, res) {
    const api_url = "https://kauth.kakao.com/oauth/authorize";
    const redirect_uri = process.env.OAUTH_KAKAO_REDIRECT_URI || '';

    res.redirect(`${api_url}?response_type=code&client_id=${process.env.OAUTH_KAKAO_CLIENT_ID}&redirect_uri=${redirect_uri}`);
});

router.get('/callback', async function (req, res) {
    const code = req.query.code;

    const api_url = "https://kauth.kakao.com/oauth/token";

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', process.env.OAUTH_KAKAO_CLIENT_ID || '');
    params.append('client_secret', process.env.OAUTH_KAKAO_CLIENT_SECRET || '');
    params.append('code', code as string);

    await fetch(`${api_url}?${params.toString()}`)
        .then(res => res.json())
        .then(async tokenData => {
            console.log(tokenData);
            const accessToken = tokenData.access_token;
            const refreshToken = tokenData.refresh_token;
            const tokenType = tokenData.token_type;
            const expiresIn = tokenData.expires_in;
        });

    // TODO: Save the token data to the database
    // TODO: Add Login session(access_token) to res cookie
});

export default router;