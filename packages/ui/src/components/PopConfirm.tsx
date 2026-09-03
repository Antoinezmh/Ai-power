import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "../lib/cn";
import { Button } from "./Button";
import { X } from "lucide-react";

export interface PopconfirmProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    placement?: "top" | "bottom" | "left" | "right";
}

export function PopConfirm({
    children,
    title = "确认操作",
    description = "确定执行此操作吗？",
    confirmText = "确定",
    cancelText = "取消",
    onConfirm,
    onCancel,
    placement = "bottom",
}: PopconfirmProps) {
    const [open, setOpen] = React.useState(false);

    const handleConfirm = () => {
        onConfirm();
        setOpen(false);
    };

    const handleCancel = () => {
        onCancel?.();
        setOpen(false);
    };

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>{children}</Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    side={placement}
                    align="center"
                    sideOffset={8}
                    className={cn(
                        "z-50 min-w-[220px] max-w-[320px] rounded-xl bg-surface-elevated border border-border-default shadow-xl",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                        "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
                        "data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2"
                    )}
                >
                    <div className="p-4">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <div className="font-semibold text-text-primary text-sm">{title}</div>
                                {description && (
                                    <div className="text-sm text-text-secondary leading-relaxed">{description}</div>
                                )}
                            </div>
                            <Popover.Close className="ml-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity">
                                <X className="h-4 w-4 text-text-muted" />
                            </Popover.Close>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="secondary" size="sm" onClick={handleCancel} className="h-8 px-4 text-sm">
                                {cancelText}
                            </Button>
                            <Button variant="danger" size="sm" onClick={handleConfirm} className="h-8 px-4 text-sm">
                                {confirmText}
                            </Button>
                        </div>
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}