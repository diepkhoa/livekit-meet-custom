import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Hàm ký số HMAC-SHA256 cho Cookie
function signData(data: object, secret: string): string {
    const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
}

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get('code');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const signingSecret = process.env.LIVEKIT_API_SECRET || 'fallback-secret-key-2026';

    const allowedTeachers = (process.env.ALLOWED_TEACHERS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase());

    if (!code) {
        return NextResponse.redirect(`${appUrl}?error=missing_code`);
    }

    try {
        // 1. Đổi code lấy Access Token từ Google
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: `${appUrl}/api/auth/callback`,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) {
            console.error('Lỗi Google Token:', tokenData);
            return NextResponse.redirect(`${appUrl}?error=google_token_failed`);
        }

        // 2. Lấy thông tin tài khoản Google
        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userData = await userRes.json();
        const userEmail = (userData.email || '').toLowerCase();

        // 3. CHỐT CHẶN BẢO MẬT: Kiểm tra email giáo viên
        if (!allowedTeachers.includes(userEmail)) {
            console.warn(`[TỪ CHỐI TRUY CẬP] Email ${userEmail} không có quyền Giáo viên.`);
            return NextResponse.redirect(`${appUrl}?error=unauthorized_teacher`);
        }

        const teacherName = userData.name || userData.given_name || 'Giáo viên';

        // 1. Ký số phiên làm việc
        const signedSessionCookie = signData(
            { name: teacherName, email: userEmail, timestamp: Date.now() },
            signingSecret
        );

        const response = NextResponse.redirect(appUrl);

        // 2. COOKIE 1: CHỨA CHỮ KÝ BẢO MẬT (Khóa chặt HttpOnly, JavaScript không thể đọc trộm)
        response.cookies.set('teacher_session', signedSessionCookie, {
            path: '/',
            httpOnly: true, // <--- BẢO MẬT TUYỆT ĐỐI CHỐNG XSS
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            sameSite: 'lax',
        });

        // 3. COOKIE 2: CHỈ CHỨA TÊN ĐỂ REACT HIỂN THỊ LÊN MÀN HÌNH (Không có giá trị xác thực)
        response.cookies.set('teacher_profile', JSON.stringify({ name: teacherName }), {
            path: '/',
            httpOnly: false,
            maxAge: 60 * 60 * 24 * 7,
            sameSite: 'lax',
        });

        return response;
    } catch (error) {
        console.error('Lỗi xác thực Google:', error);
        return NextResponse.redirect(`${appUrl}?error=server_error`);
    }
}