'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/Home.module.css';

interface TeacherInfo {
  name: string;
  email: string;
}

export default function Home() {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);

  // Tự động kiểm tra xem Giáo viên đã đăng nhập Google chưa qua Cookie
  useEffect(() => {
    const cookies = document.cookie.split('; ');
    const sessionCookie = cookies.find((row) => row.startsWith('teacher_session='));
    if (sessionCookie) {
      try {
        const data = JSON.parse(decodeURIComponent(sessionCookie.split('=')[1]));
        setTeacher(data);
        setParticipantName(data.name); // Tự động lấy tên Google làm tên trong lớp
      } catch (e) {
        console.error('Lỗi đọc session:', e);
      }
    }
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(''); // Xóa lỗi cũ nếu có
    const finalName = teacher ? teacher.name : participantName.trim();
    if (!roomName.trim() || !finalName) return;

    // NẾU LÀ HỌC SINH: Kiểm tra trước xem phòng có tồn tại không
    if (!teacher) {
      try {
        const checkRes = await fetch(
          `/api/connection-details?roomName=${encodeURIComponent(roomName.trim())}&participantName=${encodeURIComponent(finalName)}`
        );
        if (!checkRes.ok) {
          const errData = await checkRes.json().catch(() => ({}));
          setAuthError(errData.error || 'Phòng học này không tồn tại hoặc chưa được giáo viên mở!');
          return;
        }
      } catch (err) {
        setAuthError('Không thể kết nối đến máy chủ.');
        return;
      }
    }

    // Nếu là giáo viên hoặc phòng đã tồn tại hợp lệ -> Cho vào lớp
    router.push(`/rooms/${encodeURIComponent(roomName.trim())}?name=${encodeURIComponent(finalName)}`);
  };

  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'unauthorized_teacher') {
      setAuthError('Tài khoản Google này không có quyền Giáo viên! Học sinh vui lòng tham gia bằng mã phòng bên dưới.');
    }
  }, []);

  // Và hiển thị alert này trên giao diện nếu có lỗi:
  {
    authError && (
      <div style={{
        background: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        color: '#fca5a5',
        padding: '12px 16px',
        borderRadius: '12px',
        fontSize: '13px',
        textAlign: 'center'
      }}>
        {authError}
      </div>
    )
  }

  return (
    <main className={styles.main}>
      <div className={styles.ambientGlow} />

      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            <span>Powered by Huongsac Inc.</span>
          </div>
          <h1 className={styles.title}>Lớp Học Cô Tuyền</h1>

        </div>

        <div className={styles.card}>
          {authError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '13px',
              lineHeight: '1.5',
              textAlign: 'center',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span>{authError}</span>
            </div>
          )}

          {/* TRƯỜNG HỢP 1: GIÁO VIÊN ĐÃ ĐĂNG NHẬP GOOGLE HỢP LỆ */}
          {teacher ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '12px 16px',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#a5b4fc', textTransform: 'uppercase', fontWeight: 600 }}>
                    Giáo viên đã xác thực
                  </div>
                  <div style={{ fontSize: '15px', color: '#fff', fontWeight: 600 }}>
                    {teacher.name}
                  </div>
                </div>
                <a href="/api/auth/logout" style={{ fontSize: '12px', color: '#f87171', textDecoration: 'none' }}>
                  Đăng xuất
                </a>
              </div>

              <form onSubmit={handleJoin} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Mã lớp học</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className={styles.button}>
                  <span>Bắt đầu lớp học</span>
                  <svg className={styles.buttonIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </form>
            </div>
          ) : (
            /* TRƯỜNG HỢP 2: CHƯA ĐĂNG NHẬP (GỒM NÚT GOOGLE VÀ FORM HỌC SINH) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <a
                href="/api/auth/login"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '12px',
                  borderRadius: '12px',
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Đăng nhập Giáo viên</span>
              </a>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
                <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Hoặc Học Sinh Vào Lớp</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
              </div>

              <form onSubmit={handleJoin} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Tên hiển thị</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Ví dụ: Bảo Ngọc, Minh Khôi..."
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Mã phòng học</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className={styles.button}>
                  <span>Vào Lớp Học</span>
                  <svg className={styles.buttonIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </form>
            </div>
          )}
        </div>

        <footer className={styles.footer}>
          <span>Highperformance meeting system</span>
          <span className={styles.divider}>•</span>
          <span>Backend by meogon | Frontend by meobi</span>
        </footer>
      </div>
    </main>
  );
}