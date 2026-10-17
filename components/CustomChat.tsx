// components/CustomChat.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@livekit/components-react';

interface CustomChatProps {
    isChatOpen: boolean;
    onClose: () => void;
    onNewMessage?: () => void;
}

export function CustomChat({ isChatOpen, onClose, onNewMessage }: CustomChatProps) {
    const { chatMessages, send, isSending } = useChat();
    const [messageText, setMessageText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 👉 DÙNG REF ĐỂ LƯU ID TIN NHẮN ĐÃ XỬ LÝ (CHỐNG TRÀN VÒNG LẶP):
    const lastProcessedIdRef = useRef<string | null>(null);
    const onNewMessageRef = useRef(onNewMessage);
    onNewMessageRef.current = onNewMessage;

    // Tự động cuộn xuống tin nhắn mới nhất
    useEffect(() => {
        if (isChatOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, isChatOpen]);

    // 👉 BẮT TIN NHẮN MỚI CHUẨN XÁC: CHỈ ĐẾM ĐÚNG 1 LẦN DUY NHẤT CHO MỖI TIN NHẮN
    useEffect(() => {
        if (chatMessages.length === 0) return;
        const latestMsg = chatMessages[chatMessages.length - 1];
        const msgId = latestMsg.id || `${latestMsg.timestamp}`;

        // Nếu đang mở chat -> Coi như đã đọc tin nhắn mới nhất
        if (isChatOpen) {
            lastProcessedIdRef.current = msgId;
            return;
        }

        // Nếu chat đang ĐÓNG và tin nhắn này CHƯA TỪNG ĐƯỢC ĐẾM:
        if (lastProcessedIdRef.current !== msgId) {
            lastProcessedIdRef.current = msgId;
            // Chỉ thông báo nếu là tin nhắn do người khác gửi
            if (!latestMsg.from?.isLocal) {
                onNewMessageRef.current?.();
            }
        }
    }, [chatMessages, isChatOpen]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageText.trim() || isSending) return;

        await send(messageText.trim());
        setMessageText('');
    };

    return (
        <aside className={`custom-chat-panel ${isChatOpen ? 'is-open' : 'is-closed'}`}>
            <div className="custom-chat-header">
                <div className="chat-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Tin nhắn trong lớp</span>
                </div>

                <button type="button" onClick={onClose} className="chat-close-btn" title="Đóng chat">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            <div className="custom-chat-messages">
                {chatMessages.length === 0 ? (
                    <div className="chat-empty">Chưa có tin nhắn nào trong lớp học.</div>
                ) : (
                    chatMessages.map((msg, index) => {
                        const isMe = Boolean(msg.from?.isLocal);
                        const senderName = msg.from?.name || msg.from?.identity || 'Thành viên';

                        return (
                            <div key={msg.id || `${msg.timestamp}-${index}`} className={`chat-message ${isMe ? 'msg-me' : 'msg-other'}`}>
                                <div className="msg-header">
                                    <span className="msg-sender">{senderName}</span>
                                    <span className="msg-time">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="msg-bubble">{msg.message}</div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="custom-chat-form">
                <input
                    type="text"
                    className="chat-input"
                    placeholder="Nhập tin nhắn..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                />
                <button type="submit" disabled={!messageText.trim() || isSending} className="chat-send-btn" title="Gửi">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </form>
        </aside>
    );
}