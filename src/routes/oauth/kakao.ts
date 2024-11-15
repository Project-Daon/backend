import express from 'express';

const router = express.Router();

router.get('/', async function (req, res) {
  const api_url = 'https://kauth.kakao.com/oauth/authorize';
  const redirect_uri = process.env.OAUTH_KAKAO_REDIRECT_URI || '';

  res.redirect(
    `${api_url}?response_type=code&client_id=${process.env.OAUTH_KAKAO_CLIENT_ID}&redirect_uri=${redirect_uri}`,
  );
});

router.get('/callback', async function (req, res) {
  const code = req.query.code;

  const api_url = 'https://kauth.kakao.com/oauth/token';

  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('client_id', process.env.OAUTH_KAKAO_CLIENT_ID || '');
  params.append('client_secret', process.env.OAUTH_KAKAO_CLIENT_SECRET || '');
  params.append('code', code as string);

  await fetch(`${api_url}?${params.toString()}`)
    .then((res) => res.json())
    .then(async (tokenData) => {
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;
      const tokenType = tokenData.token_type;
      const expiresIn = tokenData.expires_in;

      // await fetch(`https://kapi.kakao.com/v2/user/me`, {
      //   headers: {
      //     Authorization: `Bearer ${accessToken}`,
      //
      //   },
      // })
      //   .then((res) => res.json())
      //   .then(async (userData) => {
      //     const access = jwt.sign({ id: id }, `${process.env.SECRET}`, {
      //       expiresIn: '1h',
      //     });
      //     const refresh = jwt.sign({ id: id }, `${process.env.SECRET}`, {
      //       expiresIn: '1y',
      //     });
      //     await con.execute('INSERT INTO refreshs (token, id) VALUES (?, ?)', [
      //       refresh,
      //       id,
      //     ]);
      //     res.cookie('access_token', access, {
      //       httpOnly: true,
      //       secure: true,
      //       sameSite: 'none',
      //       domain: '.daon.today',
      //       maxAge: 3600000,
      //     });
      //     res.cookie('refresh_token', refresh, {
      //       httpOnly: true,
      //       secure: true,
      //       sameSite: 'none',
      //       domain: '.daon.today',
      //       maxAge: 31536000000,
      //     });
      //   })

      return res.json(tokenData);
    });

  // TODO: Save the token data to the database
  // TODO: Add Login session(access_token) to res cookie

  // {
  //   access_token: 'O8wX20xJ6SQCaN4T7Ux7a-LWEJYQSCYKAAAAAQopyNoAAAGTBsnRfm1lzvpaqIEo',
  //   token_type: 'bearer',
  //   refresh_token: 'iID6Q3nhdGcMeEd4MiYcucTdL020rYCYAAAAAgopyNoAAAGTBsnReW1lzvpaqIEo',
  //   expires_in: 21599,
  //   scope: 'account_email profile_image profile_nickname',
  //   refresh_token_expires_in: 5183999
  // }
});

export default router;
