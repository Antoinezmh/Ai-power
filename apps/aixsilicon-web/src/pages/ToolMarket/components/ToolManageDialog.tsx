import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Input,
    Textarea,
    Button,
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
} from '@aixsilicon/ui';
import { useCreateTool, useUpdateTool } from '@/features/tools/hooks/useTools';
import { Tool } from '@/features/tools/api/toolsApi';
import { message } from '@aixsilicon/ui';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingTool?: Tool | null;
    onSuccess?: () => void;
}

export function ToolManageDialog({ open, onOpenChange, editingTool, onSuccess }: Props) {
    const createTool = useCreateTool();
    const updateTool = useUpdateTool();

    // 表单状态
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [owner, setOwner] = useState('');
    const [icon, setIcon] = useState('🔧');
    const [type, setType] = useState<'internal' | 'static' | 'external' | 'executable' | 'streamlit'>('internal');
    const [source, setSource] = useState('');
    const [entry, setEntry] = useState('index.html');

    // === 新增：可执行程序专用字段 ===
    const [executablePath, setExecutablePath] = useState('');
    const [executableArgs, setExecutableArgs] = useState('');
    const [executableWorkingDir, setExecutableWorkingDir] = useState('');
    const [streamlitPort, setStreamlitPort] = useState<number | undefined>(undefined);

    // === 文件中心分类字段 ===
    const [groupName, setGroupName] = useState('');
    const [funcType, setFuncType] = useState('');
    const [namespace, setNamespace] = useState('');

    // 八大一级分组（与后端 file_center.py GROUPS 保持一致）
    const GROUP_OPTIONS = ['器件组', 'GaN功率组', '系统与表征组', '外延组', 'sic开发组', '射频组', '工艺工程组', 'si基研发组'];
    // 三个功能型（与后端 file_center.py FUNC_TYPES 保持一致）
    const FUNC_TYPE_OPTIONS = ['数据处理', '报告产出', '原始数据'];

    // 错误状态
    const [errors, setErrors] = useState<Record<string, string>>({});

    const isEditing = !!editingTool;

    // 填充编辑数据
    useEffect(() => {
        if (editingTool) {
            setName(editingTool.name);
            setDescription(editingTool.description || '');
            setTags((editingTool.tags || []).join(', '));
            setOwner(editingTool.owner || '');
            setIcon(editingTool.icon || '🔧');
            setType(editingTool.type || 'internal');
            setSource(editingTool.source || '');
            setEntry(editingTool.entry || 'index.html');
            // 可执行程序字段
            setExecutablePath(editingTool.executable_path || '');
            setExecutableArgs(editingTool.executable_args ? JSON.stringify(editingTool.executable_args) : '');
            setExecutableWorkingDir(editingTool.executable_working_dir || '');
            setStreamlitPort(editingTool.streamlit_port);
            // 文件中心分类字段
            setGroupName(editingTool.group_name || '');
            setFuncType(editingTool.func_type || '');
            setNamespace(editingTool.namespace || '');
        } else {
            setName('');
            setDescription('');
            setTags('');
            setOwner('');
            setIcon('🔧');
            setType('internal');
            setSource('');
            setEntry('index.html');
            setExecutablePath('');
            setExecutableArgs('');
            setExecutableWorkingDir('');
            setStreamlitPort(undefined);
            // 文件中心分类字段
            setGroupName('');
            setFuncType('');
            setNamespace('');
        }
        setErrors({});
    }, [editingTool, open]);

    // 动态路径提示
    const getSourcePlaceholder = () => {
        switch (type) {
            case 'internal':
                return '/api/v1/custom/xxx  (例如：/api/v1/chat)';
            case 'static':
                return '/tools/xxx/  (例如：/tools/editor/)';
            case 'external':
                return 'https://example.com/tool';
            case 'executable':
                return 'C:\\tools\\myapp.exe';
            case 'streamlit':
                return 'Streamlit 应用路径（可选）';
            default:
                return '请输入资源路径';
        }
    };

    const getSourceHint = () => {
        switch (type) {
            case 'internal':
                return '📌 后端 API 的相对路径（不含域名），前端会通过代理访问';
            case 'static':
                return '📁 静态文件在 Nginx 中挂载的目录路径，必须以 /tools/ 开头，并以 / 结尾';
            case 'external':
                return '🔗 完整的 HTTPS/HTTP 外部链接，将直接在新窗口打开';
            case 'executable':
                return '⚙️ 可执行文件绝对路径，需放置在允许目录下（如 executables 文件夹）';
            case 'streamlit':
                return '📊 Streamlit 应用，需预先部署并由 Nginx 代理（端口配置在下方）';
            default:
                return '';
        }
    };

    // 表单校验（全部必填）
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!name.trim()) newErrors.name = '工具名称不能为空';
        if (!description.trim()) newErrors.description = '描述不能为空';
        if (!groupName) newErrors.groupName = '请选择一级分组';
        if (!funcType) newErrors.funcType = '请选择功能型';
        if (!tags.trim()) newErrors.tags = '标签不能为空（逗号分隔）';
        if (!owner.trim()) newErrors.owner = '负责人不能为空';
        if (!icon.trim()) newErrors.icon = '图标不能为空';
        if (!source.trim()) {
            // 外部链接允许为空（打开时给提示）；其余类型必填
            if (type !== 'external') newErrors.source = '资源路径不能为空';
        } else if (type === 'static' && !source.startsWith('/tools/')) {
            newErrors.source = '静态文件路径必须以 /tools/ 开头';
        } else if (type === 'external') {
            // 软校验：URL 不合规/为空不阻止保存，打开时前端给提示
        }
        if (type === 'static' && !entry.trim()) {
            newErrors.entry = '入口文件不能为空';
        }
        if (type === 'executable' && !executablePath.trim()) {
            newErrors.executablePath = '可执行文件路径不能为空';
        }
        if (type === 'executable' && executableArgs.trim()) {
            try {
                const parsed = JSON.parse(executableArgs);
                if (!Array.isArray(parsed)) {
                    newErrors.executableArgs = '参数必须是 JSON 数组';
                }
            } catch {
                newErrors.executableArgs = '参数必须是有效的 JSON 格式';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        const data: any = {
            name: name.trim(),
            description: description.trim(),
            group_name: groupName.trim(),
            func_type: funcType.trim(),
            namespace: namespace.trim() || groupName.trim(),
            tags: tags.split(',').map(s => s.trim()).filter(Boolean),
            owner: owner.trim(),
            icon: icon.trim(),
            type,
            source: source.trim(),
            entry: type === 'static' ? entry.trim() : undefined,
            executable_path: type === 'executable' ? executablePath.trim() : null,
            executable_args: type === 'executable' && executableArgs.trim() ? JSON.parse(executableArgs) : null,
            executable_working_dir: type === 'executable' && executableWorkingDir.trim() ? executableWorkingDir.trim() : null,
            streamlit_port: type === 'streamlit' ? streamlitPort : null,
        };

        try {
            if (isEditing) {
                await updateTool.mutateAsync({ id: editingTool!.id, data });
                message.success('工具已更新');
            } else {
                await createTool.mutateAsync(data);
                message.success('新工具已添加');
            }
            onSuccess?.();
            onOpenChange(false);
        } catch (error) {
            message.error('操作失败：' + (error as Error).message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? '编辑工具' : '新建工具'}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                    {/* 名称（必填） */}
                    <div>
                        <label className="text-sm font-medium text-red-500">*</label>
                        <label className="text-sm font-medium ml-1">名称</label>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className={`mt-1 ${errors.name ? 'border-danger' : ''}`}
                            placeholder="请输入工具名称"
                        />
                        {errors.name && <p className="text-xs text-danger mt-1">{errors.name}</p>}
                    </div>

                    {/* 一级分组（必填）*/}
                    <div>
                        <label className="text-sm font-medium text-red-500">*</label>
                        <label className="text-sm font-medium ml-1">一级分组</label>
                        <Select value={groupName} onValueChange={setGroupName}>
                            <SelectTrigger className={`mt-1 ${errors.groupName ? 'border-danger' : ''}`}>
                                <span>{groupName || '请选择一级分组'}</span>
                            </SelectTrigger>
                            <SelectContent>
                                {GROUP_OPTIONS.map(g => (
                                    <SelectItem key={g} value={g}>{g}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.groupName && <p className="text-xs text-danger mt-1">{errors.groupName}</p>}
                    </div>

                    {/* 功能型（必填）*/}
                    <div>
                        <label className="text-sm font-medium text-red-500">*</label>
                        <label className="text-sm font-medium ml-1">功能型</label>
                        <Select value={funcType} onValueChange={setFuncType}>
                            <SelectTrigger className={`mt-1 ${errors.funcType ? 'border-danger' : ''}`}>
                                <span>{funcType || '请选择功能型'}</span>
                            </SelectTrigger>
                            <SelectContent>
                                {FUNC_TYPE_OPTIONS.map(f => (
                                    <SelectItem key={f} value={f}>{f}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.funcType && <p className="text-xs text-danger mt-1">{errors.funcType}</p>}
                    </div>

                    {/* 工具空间 / 命名空间 */}
                    <div className="col-span-2">
                        <label className="text-sm font-medium ml-1">工具空间（namespace）</label>
                        <Input
                            value={namespace}
                            onChange={e => setNamespace(e.target.value)}
                            className="mt-1"
                            placeholder="推荐填写工具英文短名，如 device-query"
                        />
                        <p className="text-xs text-text-muted mt-1">
                            📁 用途：定义该工具在文件中心的专属存储/权限目录名。
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                            存放路径：{groupName ? `「${groupName} / ${funcType || '功能型'} / ${namespace || '工具空间'} / 文件」` : '「一级分组 / 功能型 / 工具空间 / 文件」'}
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                            ✍️ 命名规则：使用英文或拼音短名（小写、可用 - 连接，如 device-query、waf-report）；需在平台内唯一。留空则默认使用「一级分组名」作为工具空间。
                        </p>
                    </div>

                    {/* 描述（必填） */}
                    <div className="col-span-2">
                        <label className="text-sm font-medium text-red-500">*</label>
                        <label className="text-sm font-medium ml-1">描述</label>
                        <Textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            className={`mt-1 ${errors.description ? 'border-danger' : ''}`}
                            placeholder="请详细描述工具功能"
                        />
                        {errors.description && <p className="text-xs text-danger mt-1">{errors.description}</p>}
                    </div>

                    {/* 标签（必填） */}
                    <div>
                        <label className="text-sm font-medium text-red-500">*</label>
                        <label className="text-sm font-medium ml-1">标签（逗号分隔）</label>
                        <Input
                            value={tags}
                            onChange={e => setTags(e.target.value)}
                            className={`mt-1 ${errors.tags ? 'border-danger' : ''}`}
                            placeholder="例如：AI, 代码"
                        />
                        {errors.tags && <p className="text-xs text-danger mt-1">{errors.tags}</p>}
                    </div>

                    {/* 负责人（必填） */}
                    <div>
                        <label className="text-sm font-medium text-red-500">*</label>
                        <label className="text-sm font-medium ml-1">负责人</label>
                        <Input
                            value={owner}
                            onChange={e => setOwner(e.target.value)}
                            className={`mt-1 ${errors.owner ? 'border-danger' : ''}`}
                            placeholder="请输入负责人姓名"
                        />
                        {errors.owner && <p className="text-xs text-danger mt-1">{errors.owner}</p>}
                    </div>

                    {/* 图标（必填） */}
                    <div>
                        <label className="text-sm font-medium text-red-500">*</label>
                        <label className="text-sm font-medium ml-1">图标（Emoji）</label>
                        <Input
                            value={icon}
                            onChange={e => setIcon(e.target.value)}
                            className={`mt-1 ${errors.icon ? 'border-danger' : ''}`}
                            placeholder="例如：🔧"
                        />
                        {errors.icon && <p className="text-xs text-danger mt-1">{errors.icon}</p>}
                    </div>

                    {/* 资源类型（必填） */}
                    <div>
                        <label className="text-sm font-medium text-red-500">*</label>
                        <label className="text-sm font-medium ml-1">资源类型</label>
                        <Select value={type} onValueChange={(v) => setType(v as any)}>
                            <SelectTrigger className="mt-1">
                                <span>{type}</span>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="internal">内部后端API</SelectItem>
                                <SelectItem value="static">静态前端文件</SelectItem>
                                <SelectItem value="external">外部链接</SelectItem>
                                <SelectItem value="executable">可执行程序 (.exe/.bat)</SelectItem>
                                <SelectItem value="streamlit">Streamlit 应用</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 入口文件（仅 static 时显示且必填） */}
                    {type === 'static' && (
                        <div>
                            <label className="text-sm font-medium text-red-500">*</label>
                            <label className="text-sm font-medium ml-1">入口文件</label>
                            <Input
                                value={entry}
                                onChange={e => setEntry(e.target.value)}
                                className={`mt-1 ${errors.entry ? 'border-danger' : ''}`}
                                placeholder="index.html"
                            />
                            {errors.entry && <p className="text-xs text-danger mt-1">{errors.entry}</p>}
                        </div>
                    )}

                    {/* 可执行程序专用字段 */}
                    {type === 'executable' && (
                        <>
                            <div className="col-span-2">
                                <label className="text-sm font-medium text-red-500">*</label>
                                <label className="text-sm font-medium ml-1">可执行文件路径</label>
                                <Input
                                    value={executablePath}
                                    onChange={e => setExecutablePath(e.target.value)}
                                    className={`mt-1 ${errors.executablePath ? 'border-danger' : ''}`}
                                    placeholder="C:\\tools\\myapp.exe"
                                />
                                {errors.executablePath && <p className="text-xs text-danger mt-1">{errors.executablePath}</p>}
                                <p className="text-xs text-text-muted mt-1">
                                    ⚠️ 必须放置在允许目录下（如 executables 文件夹）
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium">工作目录</label>
                                <Input
                                    value={executableWorkingDir}
                                    onChange={e => setExecutableWorkingDir(e.target.value)}
                                    className="mt-1"
                                    placeholder="C:\\tools"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">启动参数（JSON 数组）</label>
                                <Input
                                    value={executableArgs}
                                    onChange={e => setExecutableArgs(e.target.value)}
                                    className={`mt-1 ${errors.executableArgs ? 'border-danger' : ''}`}
                                    placeholder='["--port", "8080"]'
                                />
                                {errors.executableArgs && <p className="text-xs text-danger mt-1">{errors.executableArgs}</p>}
                            </div>
                        </>
                    )}

                    {/* Streamlit 专用字段 */}
                    {type === 'streamlit' && (
                        <div>
                            <label className="text-sm font-medium">Streamlit 端口</label>
                            <Input
                                type="number"
                                value={streamlitPort || ''}
                                onChange={e => setStreamlitPort(e.target.value ? parseInt(e.target.value) : undefined)}
                                className="mt-1"
                                placeholder="8501"
                            />
                            <p className="text-xs text-text-muted mt-1">
                                📊 Nginx 将代理到此端口，需提前部署 Streamlit 服务
                            </p>
                        </div>
                    )}

                    {/* 资源路径（必填） */}
                    <div className="col-span-2">
                        <label className="text-sm font-medium text-red-500">*</label>
                        <label className="text-sm font-medium ml-1">资源路径（source）</label>
                        <Input
                            value={source}
                            onChange={e => setSource(e.target.value)}
                            placeholder={getSourcePlaceholder()}
                            className={`mt-1 ${errors.source ? 'border-danger' : ''}`}
                        />
                        {errors.source && <p className="text-xs text-danger mt-1">{errors.source}</p>}
                        <p className="text-xs text-text-muted mt-1">{getSourceHint()}</p>
                        {type === 'external' && source.trim() && !source.startsWith('http://') && !source.startsWith('https://') && (
                            <p className="text-xs text-amber-600 mt-1">
                                ⚠️ 建议以 http:// 或 https:// 开头，否则点击打开时可能无法正常访问。
                            </p>
                        )}
                        {type === 'external' && !source.trim() && (
                            <p className="text-xs text-amber-600 mt-1">
                                ⚠️ 未填写外部链接，使用时点击「打开」将提示地址无效。
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={createTool.isPending || updateTool.isPending}
                    >
                        {createTool.isPending || updateTool.isPending
                            ? '保存中...'
                            : isEditing
                                ? '更新'
                                : '创建'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}