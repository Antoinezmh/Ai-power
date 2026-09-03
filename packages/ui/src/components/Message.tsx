import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { cn } from "../lib/cn";

export type MessageType = "success" | "error" | "warning" | "info";

interface MessageOptions {
    content: string;
    type?: MessageType;
    duration?: number;
}

// 图标映射
const iconMap: Record<MessageType, string> = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
};

// 颜色类映射
const typeClassMap: Record<MessageType, string> = {
    success: "bg-green-50 border-green-400 text-green-800",
    error: "bg-red-50 border-red-400 text-red-800",
    warning: "bg-yellow-50 border-yellow-400 text-yellow-800",
    info: "bg-blue-50 border-blue-400 text-blue-800",
};

let messageRoot: ReactDOM.Root | null = null;

function getMessageContainer() {
    let container = document.getElementById("message-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "message-container";
        container.className =
            "fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-3 pointer-events-none";
        document.body.appendChild(container);
    }
    return container;
}

function MessageContent({
    content,
    type = "info",
    duration = 3000,
    onClose,
}: MessageOptions & { onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div
            className={cn(
                "pointer-events-auto flex items-center gap-2 rounded-lg border px-5 py-3 shadow-lg animate-in fade-in slide-in-from-top-3 duration-300",
                typeClassMap[type]
            )}
            style={{ minWidth: "150px", maxWidth: "500px" }}
        >
            <span className="text-base">{iconMap[type]}</span>
            <span className="text-sm font-medium">{content}</span>
        </div>
    );
}

export function message(options: MessageOptions | string) {
    const opts = typeof options === "string" ? { content: options } : options;
    const { content, type = "info", duration = 3000 } = opts;

    const container = getMessageContainer();
    const root = messageRoot || ReactDOM.createRoot(container);
    messageRoot = root;

    const close = () => {
        root.unmount();
        if (container.parentNode) {
            container.remove();
        }
        messageRoot = null;
    };

    root.render(
        <MessageContent
            content={content}
            type={type}
            duration={duration}
            onClose={close}
        />
    );
}

// 便捷方法
message.success = (content: string, duration?: number) =>
    message({ content, type: "success", duration });
message.error = (content: string, duration?: number) =>
    message({ content, type: "error", duration });
message.warning = (content: string, duration?: number) =>
    message({ content, type: "warning", duration });
message.info = (content: string, duration?: number) =>
    message({ content, type: "info", duration });