'use client';

import React, { useState, useEffect } from 'react';

export function CinemaFullscreenButton() {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const active = !!(
                document.fullscreenElement ||
                (document as any).webkitFullscreenElement
            );
            setIsFullscreen(active);

            // Khi thoát toàn màn hình: Tự động trả điện thoại về trạng thái xoay dọc bình thường
            if (!active && screen.orientation && (screen.orientation as any).unlock) {
                (screen.orientation as any).unlock();
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    const toggleCinemaMode = async (e: React.MouseEvent) => {
        e.stopPropagation();

        // 👉 PHÓNG TO KHUNG CHỨA (CONTAINER) THAY VÌ PHÓNG TO THẺ VIDEO
        // Để trình duyệt không bao giờ hiện thanh đếm giờ '0:49' và nút tạm dừng!
        const roomContainer =
            document.querySelector('.lk-room-container') ||
            document.querySelector('.lk-video-conference') ||
            document.documentElement;

        const isCurrentlyFullscreen = !!(
            document.fullscreenElement ||
            (document as any).webkitFullscreenElement
        );

        if (!isCurrentlyFullscreen) {
            try {
                if (roomContainer.requestFullscreen) {
                    await roomContainer.requestFullscreen();
                } else if ((roomContainer as any).webkitRequestFullscreen) {
                    await (roomContainer as any).webkitRequestFullscreen();
                } else {
                    // Dự phòng riêng cho iPhone (chỉ iPhone Safari mới phải gọi thẻ video)
                    const video = document.querySelector('.lk-focus-layout video') || document.querySelector('video');
                    if (video && (video as any).webkitEnterFullscreen) {
                        (video as any).webkitEnterFullscreen();
                        return;
                    }
                }

                // Tự động xoay ngang điện thoại ngay lập tức
                if (screen.orientation && (screen.orientation as any).lock) {
                    await (screen.orientation as any).lock('landscape').catch(() => { });
                }
            } catch (err) {
                console.warn('Lỗi mở toàn màn hình:', err);
            }
        } else {
            try {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if ((document as any).webkitExitFullscreen) {
                    await (document as any).webkitExitFullscreen();
                }
            } catch (err) {
                console.warn('Lỗi thoát toàn màn hình:', err);
            }
        }
    };

    return (
        <button
            type="button"
            onClick={toggleCinemaMode}
            className={`custom-btn ${isFullscreen ? 'active' : 'neutral'}`}
            title={isFullscreen ? 'Thu nhỏ' : 'Xem toàn màn hình ngang'}
        >
            {isFullscreen ? (
                // Icon thu nhỏ
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
            ) : (
                // Icon mở toàn màn hình
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
            )}
        </button>
    );
}