import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function signData(data: object, secret: string): string {
    const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
}

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state'); // Nhận state Google trả về
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const signingSecret = process.env.LIVEKIT_API_SECRET;

    // 👉 1. CHỐT CHẶN: Bắt buộc phải có LIVEKIT_API_SECRET thật, cấm dùng key mặc định
    if (!signingSecret) {
        console.error('Thiếu LIVEKIT_API_SECRET trên server');
        return NextResponse.redirect(`${appUrl}?error=server_misconfigured`);
    }

    // 👉 2. CHỐT CHẶN: Xác minh mã state chống tấn công giả mạo CSRF
    const savedState = req.cookies.get('oauth_state')?.value;
    if (!state || !savedState || state !== savedState) {
        console.warn('[CẢNH BÁO BẢO MẬT] Mã OAuth state không khớp hoặc bị tấn công CSRF.');
        return NextResponse.redirect(`${appUrl}?error=csrf_detected`);
    }

    const allowedTeachers = (process.env.ALLOWED_TEACHERS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase());

    if (!code) {
        return NextResponse.redirect(`${appUrl}?error=missing_code`);
    }

    try {
        // 3. Đổi code lấy Access Token từ Google
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

        // 4. Lấy thông tin tài khoản Google
        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userData = await userRes.json();
        const userEmail = (userData.email || '').toLowerCase();

        // 5. CHỐT CHẶN BẢO MẬT: Kiểm tra email giáo viên Whitelist
        if (!allowedTeachers.includes(userEmail)) {
            console.warn(`[TỪ CHỐI TRUY CẬP] Email ${userEmail} không có quyền Giáo viên.`);
            return NextResponse.redirect(`${appUrl}?error=unauthorized_teacher`);
        }

        const teacherName = userData.name || userData.given_name || 'Giáo viên';

        // 6. Ký số phiên làm việc
        const signedSessionCookie = signData(
            { name: teacherName, email: userEmail, timestamp: Date.now() },
            signingSecret
        );

        const response = NextResponse.redirect(appUrl);

        // Xóa cookie oauth_state sau khi đã dùng xong
        response.cookies.delete('oauth_state');

        // COOKIE 1: Chứa chữ ký bảo mật (HttpOnly chống XSS hoàn toàn)
        response.cookies.set('teacher_session', signedSessionCookie, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            sameSite: 'lax',
        });

        // COOKIE 2: Chỉ chứa tên để React hiển thị (không có quyền hạn bảo mật)
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