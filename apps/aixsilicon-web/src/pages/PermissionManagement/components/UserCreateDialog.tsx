import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Input,
    Button,
} from '@aixsilicon/ui';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: { username: string; email: string; password: string; full_name?: string }) => void;
    isLoading?: boolean;
}

export default function UserCreateDialog({ open, onOpenChange, onSubmit, isLoading }: Props) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');

    const handleSubmit = () => {
        if (!username || !email || !password) return;
        onSubmit({ username, email, password, full_name: fullName || undefined });
        setUsername('');
        setEmail('');
        setPassword('');
        setFullName('');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>新增用户</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div>
                        <label className="text-sm font-medium">用户名 *</label>
                        <Input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">邮箱 *</label>
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">密码 *</label>
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">全名（可选）</label>
                        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>取消</Button>
                    <Button onClick={handleSubmit} disabled={!username || !email || !password || isLoading}>
                        {isLoading ? '创建中...' : '创建'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}