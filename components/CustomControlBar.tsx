'use client';

import React from 'react';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';

export function CustomControlBar() {
    const room = useRoomContext();
    const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
        useLocalParticipant();

    const toggleMic = async () => {
        try {
            await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
        } catch (e) {
            console.error('Lỗi Mic:', e);
        }
    };

    const toggleCam = async () => {
        try {
            await localParticipant.setCameraEnabled(!isCameraEnabled);
        } catch (e) {
            console.error('Lỗi Camera:', e);
        }
    };

    // 👉 ĐÃ TINH CHỈNH ĐỂ ĐẠT 60 FPS VÀ 1080p / 2K TẠI ĐÂY:
    const toggleScreen = async () => {
        try {
            if (isScreenShareEnabled) {
                // Tắt chia sẻ màn hình
                await localParticipant.setScreenShareEnabled(false);
            } else {
                // Bật chia sẻ màn hình với thông số 60 FPS cao cấp
                await localParticipant.setScreenShareEnabled(
                    true,
                    // 1. Capture Options (Yêu cầu trình duyệt quay màn hình)
                    {
                        audio: true, // Cho phép chia sẻ kèm âm thanh hệ thống/tab
                        selfBrowserSurface: 'include',
                        resolution: {
                            // Chọn độ phân giải:
                            // - 1080p: width: 1920, height: 1080
                            // - 2K:    width: 2560, height: 1440
                            width: 2560,
                            height: 1440,
                            frameRate: 60, // Ép trình duyệt bắt 60 khung hình/giây
                        },
                        // Bắt buộc để trình duyệt tối ưu mượt mà chuyển động 60fps
                        contentHint: 'motion',
                    },
                    // 2. Publish Options (Đẩy bitrate cao lên WebRTC)
                    {
                        screenShareEncoding: {
                            // 10_000_000 (10 Mbps) cho 1080p60 | 14_000_000 (14 Mbps) cho 2K60
                            maxBitrate: 14_000_000,
                            maxFramerate: 60,
                        },
                        // Giữ vững 60 FPS khi mạng yếu (sẽ hạ bớt độ phân giải để không giật hình)
                        degradationPreference: 'maintain-framerate',
                    }
                );
            }
        } catch (error: any) {
            // Bỏ qua lỗi nếu người dùng bấm "Hủy" (Cancel) ở popup chọn màn hình
            if (error?.name !== 'NotAllowedError') {
                console.error('Lỗi khi chia sẻ màn hình:', error);
            }
        }
    };

    const toggleChat = () => {
        const chatBtn = document.querySelector('.lk-chat-toggle') as HTMLButtonElement;
        if (chatBtn) {
            chatBtn.click();
        }
    };

    const handleLeave = () => {
        try {
            room.disconnect();
        } catch (e) { }
        window.location.href = '/';
    };

    return (
        <div className="custom-control-bar">
            {/* 1. Nút Mic */}
            <button
                type="button"
                onClick={toggleMic}
                className={`custom-btn ${isMicrophoneEnabled ? 'active' : 'muted'}`}
                title={isMicrophoneEnabled ? 'Tắt Micro' : 'Bật Micro'}
            >
                {isMicrophoneEnabled ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="2" x2="22" y1="2" y2="22" />
                        <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
                        <path d="M5 10v2a7 7 0 0 0 12 5" />
                        <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
                        <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                )}
            </button>

            {/* 2. Nút Cam */}
            <button
                type="button"
                onClick={toggleCam}
                className={`custom-btn ${isCameraEnabled ? 'active' : 'muted'}`}
                title={isCameraEnabled ? 'Tắt Camera' : 'Bật Camera'}
            >
                {isCameraEnabled ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11" />
                        <rect x="2" y="6" width="14" height="12" rx="3" />
                    </svg>
                ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196" />
                        <path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
                        <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                )}
            </button>

            {/* 3. Nút Share Screen */}
            <button
                type="button"
                onClick={toggleScreen}
                className={`custom-btn ${isScreenShareEnabled ? 'sharing' : 'neutral'}`}
                title={isScreenShareEnabled ? 'Dừng chia sẻ' : 'Chia sẻ màn hình (60 FPS)'}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8" />
                    <path d="M12 17v4" />
                    <path d="m12 7 3 3" />
                    <path d="m12 7-3 3" />
                    <path d="M12 7v6" />
                </svg>
            </button>

            {/* 4. Nút Chat */}
            <button
                type="button"
                onClick={toggleChat}
                className="custom-btn neutral"
                title="Trò chuyện"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            </button>

            {/* 5. Nút Rời phòng */}
            <button
                type="button"
                onClick={handleLeave}
                className="custom-btn danger"
                title="Rời lớp học"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
            </button>
        </div>
    );
}