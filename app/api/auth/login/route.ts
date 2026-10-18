import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // 👉 Tạo mã ngẫu nhiên bí mật state chống tấn công CSRF
    const state = crypto.randomBytes(32).toString('hex');

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `${appUrl}/api/auth/callback`,
        response_type: 'code',
        scope: 'openid email profile',
        prompt: 'select_account',
        state, // Gửi state sang Google
    });

    const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);

    // Lưu state vào cookie tạm thời (sống trong 10 phút)
    response.cookies.set('oauth_state', state, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 10,
        sameSite: 'lax',
    });

    return response;
}