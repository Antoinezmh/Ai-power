import { useState } from 'react';
import { Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@aixsilicon/ui';
import { Plus, Trash2, Copy } from 'lucide-react';
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from '@/features/settings/hooks/useSettings';

export default function ApiKeysForm() {
  const { data: apiKeys = [], isLoading, refetch } = useApiKeys();
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    await createApiKey.mutateAsync(newKeyName.trim());
    setNewKeyName('');
    setIsCreateOpen(false);
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除此密钥吗？')) {
      await deleteApiKey.mutateAsync(id);
      refetch();
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    alert('已复制到剪贴板');
  };

  if (isLoading) return <div>加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">API 密钥</h2>
          <p className="text-sm text-text-secondary">管理您的 API 访问密钥</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> 创建密钥
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>密钥</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead>最后使用</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apiKeys.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-text-muted py-8">暂无密钥</TableCell>
            </TableRow>
          ) : (
            apiKeys.map(key => (
              <TableRow key={key.id}>
                <TableCell className="font-medium">{key.name}</TableCell>
                <TableCell>
                  <code className="rounded bg-surface-subtle px-2 py-1 text-xs font-mono">{key.key}</code>
                  <Button variant="ghost" size="icon" className="ml-2 h-6 w-6" onClick={() => copyKey(key.key)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </TableCell>
                <TableCell className="text-text-secondary">{key.created_at}</TableCell>
                <TableCell className="text-text-secondary">{key.last_used || '从未使用'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="text-danger hover:text-danger" onClick={() => handleDelete(key.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建 API 密钥</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-text-primary">密钥名称</label>
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="例如：生产环境"
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!newKeyName.trim() || createApiKey.isPending}>
              {createApiKey.isPending ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}