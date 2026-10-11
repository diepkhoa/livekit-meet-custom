import { NextResponse } from 'next/server';

export async function GET() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = NextResponse.redirect(appUrl);

    // Xóa cả 2 cookie phiên làm việc
    res.cookies.delete('teacher_session');
    res.cookies.delete('teacher_profile');

    return res;
}