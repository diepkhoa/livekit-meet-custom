import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Hàm giải mã và xác minh chữ ký số của Cookie
function verifySignedData(cookieValue: string, secret: string): any | null {
  try {
    const [payload, signature] = cookieValue.split('.');
    if (!payload || !signature) return null;

    // Tính toán lại chữ ký dự kiến bằng khóa bí mật của máy chủ
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');

    // So sánh an toàn chống tấn công Timing Attack
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null; // Chữ ký bị sai -> Có kẻ đang giả mạo Cookie!
    }

    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let roomName = searchParams.get('roomName');
    let participantName = searchParams.get('participantName');

    // 1. CHỐT CHẶN BẢO MẬT ĐẦU VÀO (INPUT VALIDATION)
    if (!roomName || !participantName) {
      return NextResponse.json({ error: 'Thiếu mã phòng hoặc tên người tham gia' }, { status: 400 });
    }

    // Giới hạn độ dài và định dạng: Chống spam phình bộ nhớ RAM LiveKit
    roomName = roomName.trim().substring(0, 64);
    participantName = participantName.trim().substring(0, 32);

    // Không cho phép mã phòng chứa ký tự nguy hiểm
    if (!/^[a-zA-Z0-9_-]+$/.test(roomName)) {
      return NextResponse.json({ error: 'Mã phòng chỉ được chứa chữ cái, số và dấu gạch ngang' }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json({ error: 'Cấu hình LiveKit trên server chưa đầy đủ' }, { status: 500 });
    }

    // 2. XÁC MINH DANH TÍNH GIÁO VIÊN BẰNG CHỮ KÝ SỐ MÁY CHỦ
    const teacherCookie = request.cookies.get('teacher_session');
    let isTeacher = false;
    let finalParticipantName = participantName;

    if (teacherCookie) {
      // Giải mã và kiểm tra chữ ký số bằng apiSecret của server
      const verifiedSession = verifySignedData(teacherCookie.value, apiSecret);

      if (verifiedSession && verifiedSession.email) {
        const allowedTeachers = (process.env.ALLOWED_TEACHERS || '')
          .split(',')
          .map((e) => e.trim().toLowerCase());

        // Kiểm tra xem email đã được xác minh có nằm trong danh sách cấp phép không
        if (allowedTeachers.includes(verifiedSession.email.toLowerCase())) {
          isTeacher = true;
          finalParticipantName = verifiedSession.name; // Ép dùng đúng tên Google của giáo viên
        }
      } else if (teacherCookie.value) {
        console.warn('[CẢNH BÁO AN NINH] Phát hiện Cookie teacher_session bị chỉnh sửa trái phép!');
      }
    }

    // 3. NẾU LÀ HỌC SINH (GUEST): KIỂM TRA PHÒNG ĐÃ MỞ CHƯA
    if (!isTeacher) {
      const httpUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
      const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);

      try {
        const rooms = await roomService.listRooms([roomName]);
        const roomExists = rooms.some((r) => r.name === roomName);

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

    // 4. CẤP VÉ TOKEN (Học sinh tuyệt đối không có quyền Admin)
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
      roomAdmin: isTeacher, // Chỉ giáo viên có chữ ký hợp lệ mới được làm Admin!
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