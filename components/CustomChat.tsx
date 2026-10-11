'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@livekit/components-react';

interface CustomChatProps {
    onClose: () => void;
}

export function CustomChat({ onClose }: CustomChatProps) {
    const { chatMessages, send, isSending } = useChat();
    const [messageText, setMessageText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Tự động cuộn xuống tin nhắn mới nhất
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageText.trim() || isSending) return;

        await send(messageText.trim());
        setMessageText('');
    };

    return (
        <aside className="custom-chat-panel">
            {/* ── HEADER KHUNG CHAT VỚI NÚT X TRÒN TINH TẾ ── */}
            <div className="custom-chat-header">
                <div className="chat-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Tin nhắn trong lớp</span>
                </div>

                {/* NÚT X ĐÓNG CHAT CHUẨN DESIGN */}
                <button type="button" onClick={onClose} className="chat-close-btn" title="Đóng chat">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* ── DANH SÁCH TIN NHẮN (MESSAGE BUBBLES) ── */}
            <div className="custom-chat-messages">
                {chatMessages.length === 0 ? (
                    <div className="chat-empty">Chưa có tin nhắn nào trong lớp học.</div>
                ) : (
                    chatMessages.map((msg) => {
                        const isMe = msg.from?.isLocal;
                        return (
                            <div key={msg.id} className={`chat-message ${isMe ? 'msg-me' : 'msg-other'}`}>
                                <div className="msg-header">
                                    <span className="msg-sender">{msg.from?.name || msg.from?.identity}</span>
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

            {/* ── FORM GỬI TIN NHẮN VỚI NÚT SEND MÁY BAY GIẤY ── */}
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