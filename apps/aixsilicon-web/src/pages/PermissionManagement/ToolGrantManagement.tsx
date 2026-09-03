import { useState } from 'react';
import {
    Card,
    CardContent,
    Button,
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Badge,
    message,
} from '@aixsilicon/ui';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toolApi } from '@/features/tools/api/toolsApi';
import { TOOLS_QUERY_KEY } from '@/features/tools/hooks/useTools';
import { useUsers, useRoles } from '@/features/permissions/hooks/usePermissions';
import { SearchableDropdown, SearchableOption } from '@/components/SearchableDropdown';

interface GrantRow {
    tool_id: string;
    tool_name: string;
    group_name?: string;
    func_type?: string;
    namespace?: string;
    level: string;
}

const LEVEL_HINTS: Record<string, string> = {
    read: '可查看文件（只读）',
    write: '可上传、修改文件',
    manage: '可管理（含删除/授权）',
};

export default function ToolGrantManagement() {
    // 全部工具（用于授权下拉选择）
    const { data: tools = [] } = useQuery({
        queryKey: [TOOLS_QUERY_KEY, 'all-grants'],
        queryFn: () => toolApi.list({ limit: 1000 }),
        staleTime: 60 * 1000,
    });

    // 用户 / 角色列表（搜索下拉数据源）
    const { data: users = [] } = useUsers({ limit: 1000 });
    const { data: roles = [] } = useRoles();

    // 已授权列表
    const { data: grants = [], refetch } = useQuery<GrantRow[]>({
        queryKey: ['tool-grants'],
        queryFn: () => api.get('/api/v1/files/tool-grants'),
        staleTime: 30 * 1000,
    });

    // 授权表单
    const [toolId, setToolId] = useState('');
    const [targetType, setTargetType] = useState<'user' | 'role'>('user');
    const [userId, setUserId] = useState('');
    const [roleId, setRoleId] = useState('');
    const [level, setLevel] = useState('read');
    const [submitting, setSubmitting] = useState(false);

    const userOptions: SearchableOption<string>[] = users.map((u) => ({
        value: u.id,
        label: u.username || u.id,
        sublabel: [u.full_name, u.email].filter(Boolean).join(' · '),
        keyword: `${u.username} ${u.full_name || ''} ${u.email || ''}`,
    }));

    const roleOptions: SearchableOption<string>[] = roles.map((r) => ({
        value: r.id,
        label: r.name,
        sublabel: `${r.user_count ?? 0} 名成员${r.description ? ' · ' + r.description : ''}`,
        keyword: `${r.name} ${r.description || ''}`,
    }));

    const resetForm = () => {
        setToolId('');
        setUserId('');
        setRoleId('');
        setLevel('read');
    };

    const handleGrant = async () => {
        if (!toolId) {
            message.warning('请先选择要授权的工具');
            return;
        }
        const targetId = targetType === 'user' ? userId : roleId;
        if (!targetId) {
            message.warning(targetType === 'user' ? '请从下拉中选择要授权的用户' : '请从下拉中选择要授权的角色');
            return;
        }
        setSubmitting(true);
        try {
            const params = new URLSearchParams({ tool_id: toolId, level });
            if (targetType === 'user') params.append('user_id', targetId);
            else params.append('role_id', targetId);
            await api.post(`/api/v1/files/tool-grants?${params.toString()}`);
            message.success('授权成功，已自动开通对应用户/角色的文件空间权限');
            refetch();
            resetForm();
        } catch (error) {
            message.error('授权失败：' + (error as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRevoke = async (row: GrantRow) => {
        if (!window.confirm(`确定撤销对该用户/角色在「${row.tool_name}」上的授权吗？`)) return;
        try {
            const params = new URLSearchParams({ tool_id: row.tool_id });
            await api.post(`/api/v1/files/tool-grants/revoke?${params.toString()}`);
            message.success('已撤销授权，对应文件空间权限同步收回');
            refetch();
        } catch (error) {
            message.error('撤销失败：' + (error as Error).message);
        }
    };

    return (
        <div className="space-y-4">
            {/* 授权表单 */}
            <Card>
                <CardContent className="p-5">
                    <h3 className="mb-1 font-medium text-text-primary">授权工具（同步开通文件中心空间权限）</h3>
                    <p className="mb-4 text-xs text-text-muted">
                        🔗 给用户或角色开通某个工具的访问权限，其「{ '<八组>/<三型>/<工具空间>' }」目录的权限会自动开通。
                    </p>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {/* 第 1 步：选择工具 */}
                        <div>
                            <label className="text-sm font-medium text-text-primary">① 选择工具</label>
                            <Select value={toolId} onValueChange={setToolId}>
                                <SelectTrigger className="mt-1.5">
                                    <span className="truncate">{tools.find(t => t.id === toolId)?.name || '请选择工具'}</span>
                                </SelectTrigger>
                                <SelectContent>
                                    {tools.map(t => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.name}（{t.group_name || '未分组'}/{t.func_type || '-'}/{t.namespace || '-'}）
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 第 2 步：选择授权对象 */}
                        <div>
                            <label className="text-sm font-medium text-text-primary">② 授权对象</label>
                            <div className="mt-1.5 inline-flex w-full justify-between rounded-md border border-border-default bg-surface-elevated p-1">
                                <button
                                    type="button"
                                    onClick={() => { setTargetType('user'); setRoleId(''); }}
                                    className={
                                        'flex-1 cursor-pointer rounded px-3 py-1 text-sm transition-colors ' +
                                        (targetType === 'user'
                                            ? 'bg-primary-500 text-white shadow-sm'
                                            : 'text-text-secondary hover:text-text-primary')
                                    }
                                >
                                    用户
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setTargetType('role'); setUserId(''); }}
                                    className={
                                        'flex-1 cursor-pointer rounded px-3 py-1 text-sm transition-colors ' +
                                        (targetType === 'role'
                                            ? 'bg-primary-500 text-white shadow-sm'
                                            : 'text-text-secondary hover:text-text-primary')
                                    }
                                >
                                    角色
                                </button>
                            </div>
                            {targetType === 'user' ? (
                                <SearchableDropdown
                                    value={userId}
                                    onChange={setUserId}
                                    options={userOptions}
                                    placeholder="选择用户"
                                    searchPlaceholder="按工号 / 姓名 / 邮箱搜索"
                                    emptyText="未找到匹配的用户"
                                    className="mt-1.5"
                                />
                            ) : (
                                <SearchableDropdown
                                    value={roleId}
                                    onChange={setRoleId}
                                    options={roleOptions}
                                    placeholder="选择角色"
                                    searchPlaceholder="按角色名 / 描述搜索"
                                    emptyText="未找到匹配的角色"
                                    className="mt-1.5"
                                />
                            )}
                        </div>

                        {/* 第 3 步：选择级别 */}
                        <div>
                            <label className="text-sm font-medium text-text-primary">③ 授权级别</label>
                            <Select value={level} onValueChange={setLevel}>
                                <SelectTrigger className="mt-1.5">
                                    <span>{level} · {LEVEL_HINTS[level]}</span>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="read">read · 可查看（只读）</SelectItem>
                                    <SelectItem value="write">write · 可上传/修改</SelectItem>
                                    <SelectItem value="manage">manage · 可管理（含删除/授权）</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 border-t border-border-default pt-4">
                        <Button onClick={handleGrant} disabled={submitting}>
                            {submitting ? '授权中...' : '确认授权'}
                        </Button>
                        <Button variant="ghost" onClick={resetForm}>清空</Button>
                    </div>
                </CardContent>
            </Card>

            {/* 已授权列表 */}
            <Card>
                <CardContent className="p-5">
                    <h3 className="mb-3 font-medium text-text-primary">已授权工具（文件空间权限）</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>工具</TableHead>
                                <TableHead>一级分组</TableHead>
                                <TableHead>功能型</TableHead>
                                <TableHead>工具空间</TableHead>
                                <TableHead>级别</TableHead>
                                <TableHead>操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {grants.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-text-muted py-8">
                                        暂无工具授权
                                    </TableCell>
                                </TableRow>
                            ) : (
                                grants.map((row, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{row.tool_name}</TableCell>
                                        <TableCell>{row.group_name || '-'}</TableCell>
                                        <TableCell>{row.func_type || '-'}</TableCell>
                                        <TableCell>{row.namespace || '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant={row.level === 'manage' ? 'danger' : row.level === 'write' ? 'success' : 'default'}>
                                                {row.level}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" className="text-danger" onClick={() => handleRevoke(row)}>
                                                撤销
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
