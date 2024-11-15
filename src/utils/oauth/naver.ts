import axios from 'axios';

interface NaverLoginVO {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface NaverProfileVO {
  id: string;
  name: string;
  gender: string;
  birthyear: string;
  birthday: string;
  mobile: string;
}

async function requestAccessToken(
  resValue: Record<string, string>,
): Promise<NaverLoginVO> {
  const data = {
    grant_type: 'authorization_code',
    client_id: process.env['login.naver.client_id'] || '',
    client_secret: process.env['login.naver.client_secret'] || '',
    code: resValue['code'],
    state: resValue['state'],
    access_token: resValue['access_token'],
    refresh_token: resValue['refresh_token'] || '',
  };

  const response = await axios.post<NaverLoginVO>(
    'https://nid.naver.com/oauth2.0/token',
    new URLSearchParams(data),
  );
  return response.data;
}

async function requestProfile(accessToken: string): Promise<NaverProfileVO> {
  const response = await axios.get('https://openapi.naver.com/v1/nid/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = response.data;

  if (data['resultcode'] === '00') {
    return data['response'] as NaverProfileVO;
  } else {
    throw new Error('Failed to retrieve profile');
  }
}
