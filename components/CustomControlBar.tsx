'use client';

import React from 'react';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';

// 👉 KHAI BÁO INTERFACE NHẬN PROPS TỪ COMPONENT CHA:
interface CustomControlBarProps {
    isChatOpen?: boolean;
    onToggleChat?: () => void;
    unreadCount?: number; // 👉 Thêm số lượng tin nhắn chưa đọc
}

export function CustomControlBar({ isChatOpen = false, onToggleChat, unreadCount = 0 }: CustomControlBarProps) {
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

    const toggleScreen = async () => {
        try {
            if (isScreenShareEnabled) {
                await localParticipant.setScreenShareEnabled(false);
            } else {
                await localParticipant.setScreenShareEnabled(
                    true,
                    {
                        audio: true,
                        selfBrowserSurface: 'include',
                        resolution: {
                            width: 1920,
                            height: 1080,
                            frameRate: 60,
                        },
                        contentHint: 'motion',
                    },
                    {
                        screenShareEncoding: {
                            maxBitrate: 10_000_000,
                            maxFramerate: 60,
                        },
                        degradationPreference: 'maintain-resolution',
                    }
                );
            }
        } catch (error: any) {
            if (error?.name !== 'NotAllowedError') {
                console.error('Lỗi chia sẻ màn hình:', error);
            }
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
                className={`custom-btn ${isMicrophoneEnabled ? 'neutral' : 'muted'}`}
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
                className={`custom-btn ${isCameraEnabled ? 'neutral' : 'muted'}`}
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

            {/* 👉 4. NÚT CHAT: Có đèn đỏ báo số tin nhắn chưa đọc */}
            <button
                type="button"
                onClick={onToggleChat}
                className={`custom-btn ${isChatOpen ? 'active' : 'neutral'}`}
                title={isChatOpen ? 'Đóng trò chuyện' : 'Mở trò chuyện'}
                style={{ position: 'relative' }} // Để neo vị trí huy hiệu đỏ
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>

                {/* HUY HIỆU ĐỎ NHẤP NHÁY BÁO TIN NHẮN CHƯA ĐỌC: */}
                {unreadCount > 0 && !isChatOpen && (
                    <span className="chat-unread-badge">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
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