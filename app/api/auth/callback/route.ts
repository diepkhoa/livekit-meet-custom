import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get('code');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const allowedTeachers = (process.env.ALLOWED_TEACHERS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase());

    if (!code) {
        return NextResponse.redirect(`${appUrl}?error=missing_code`);
    }

    try {
        // 1. Đổi code lấy Token trực tiếp từ máy chủ Google
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

        // 3. CHỐT CHẶN BẢO MẬT: KIỂM TRA EMAIL CÓ TRONG DANH SÁCH GIÁO VIÊN KHÔNG
        if (!allowedTeachers.includes(userEmail)) {
            console.warn(`[TỪ CHỐI TRUY CẬP] Email ${userEmail} không phải là giáo viên.`);
            // Bị chặn ngay lập tức, trả về trang chủ với thông báo không có quyền
            return NextResponse.redirect(`${appUrl}?error=unauthorized_teacher`);
        }

        // 4. Nếu đúng là giáo viên: Lưu thông tin vào Cookie
        const teacherName = userData.name || userData.given_name || 'Giáo viên';
        const response = NextResponse.redirect(appUrl);

        response.cookies.set(
            'teacher_session',
            JSON.stringify({ name: teacherName, email: userEmail, verified: true }),
            {
                path: '/',
                httpOnly: false,
                maxAge: 60 * 60 * 24 * 7, // 7 ngày
                sameSite: 'lax',
            }
        );

        return response;
    } catch (error) {
        console.error('Lỗi xác thực Google:', error);
        return NextResponse.redirect(`${appUrl}?error=server_error`);
    }
}