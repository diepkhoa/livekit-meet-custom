import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const roomName = searchParams.get('roomName');
    const participantName = searchParams.get('participantName');

    if (!roomName || !participantName) {
      return NextResponse.json({ error: 'Thiếu mã phòng hoặc tên người tham gia' }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json({ error: 'Cấu hình LiveKit trên server chưa đầy đủ' }, { status: 500 });
    }

    // 1. KIỂM TRA XEM NGƯỜI YÊU CẦU CÓ PHẢI LÀ GIÁO VIÊN ĐÃ ĐĂNG NHẬP GOOGLE KHÔNG
    const teacherCookie = request.cookies.get('teacher_session');
    let isTeacher = false;
    let finalParticipantName = participantName;

    if (teacherCookie) {
      try {
        const session = JSON.parse(teacherCookie.value);
        const allowedTeachers = (process.env.ALLOWED_TEACHERS || '')
          .split(',')
          .map((e) => e.trim().toLowerCase());

        if (session.email && allowedTeachers.includes(session.email.toLowerCase())) {
          isTeacher = true;
          finalParticipantName = session.name; // Luôn dùng tên Google đã xác thực
        }
      } catch (e) {
        // Cookie không hợp lệ
      }
    }

    // 2. NẾU LÀ HỌC SINH (CHƯA ĐĂNG NHẬP): BẮT BUỘC KIỂM TRA PHÒNG ĐÃ TỒN TẠI CHƯA
    if (!isTeacher) {
      // Chuyển wss:// thành https:// để gọi API quản trị của LiveKit
      const httpUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
      const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);

      try {
        const rooms = await roomService.listRooms([roomName]);
        const roomExists = rooms.some((r) => r.name === roomName);

        // NẾU PHÒNG CHƯA ĐƯỢC TẠO BỞI GIÁO VIÊN -> CHẶN NGAY LẬP TỨC!
        if (!roomExists) {
          return NextResponse.json(
            { error: 'Phòng học này không tồn tại hoặc chưa được giáo viên mở!' },
            { status: 404 }
          );
        }
      } catch (err) {
        console.error('Lỗi khi kiểm tra phòng học:', err);
        return NextResponse.json({ error: 'Không thể kiểm tra trạng thái phòng học' }, { status: 500 });
      }
    }

    // 3. CẤP VÉ TOKEN (Học sinh chỉ có quyền nghe/nói/xem, Giáo viên có quyền Host)
    const at = new AccessToken(apiKey, apiSecret, {
      identity: finalParticipantName,
      name: finalParticipantName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isTeacher, // Chỉ giáo viên mới có quyền Admin của phòng
    });

    const token = await at.toJwt();

    return NextResponse.json({
      serverUrl: livekitUrl,
      roomName,
      participantToken: token,
      participantName: finalParticipantName,
    });
  } catch (error) {
    console.error('Lỗi sinh token:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}