import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import mysql from "mysql2/promise";

const router = express.Router();

router.get('/', async function (req, res) {
    const api_url = "https://nid.naver.com/oauth2.0/authorize";
    const redirect_uri = process.env.OAUTH_NAVER_REDIRECT_URI || '';
    const state = uuidv4();

    res.redirect(`${api_url}?response_type=code&client_id=${process.env.OAUTH_NAVER_CLIENT_ID}&redirect_uri=${redirect_uri}&state=${state}`);
});

router.get('/callback', async function (req, res) {
    const code = req.query.code;
    const state = req.query.state;

    const api_url = "https://nid.naver.com/oauth2.0/token";

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', process.env.OAUTH_NAVER_CLIENT_ID || '');
    params.append('client_secret', process.env.OAUTH_NAVER_CLIENT_SECRET || '');
    params.append('redirect_uri', process.env.OAUTH_NAVER_REDIRECT_URI || '');
    params.append('code', code as string);
    params.append('state', state as string);

    await fetch(`${api_url}?${params.toString()}`)
        .then(res => res.json())
        .then(async tokenData => {
            const accessToken = tokenData.access_token;
            const refreshToken = tokenData.refresh_token;
            const tokenType = tokenData.token_type;
            const expiresIn = tokenData.expires_in;

            // TODO: Save the token data to the database
            // TODO: Add Login session(access_token) to res cookie
        })
});

export default router;