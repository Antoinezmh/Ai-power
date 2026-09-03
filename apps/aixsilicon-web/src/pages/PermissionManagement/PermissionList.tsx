import { useState } from 'react';
import {
  Card,
  CardContent,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
} from '@aixsilicon/ui';
import { usePermissionsList } from '@/features/permissions/hooks/usePermissions';

export default function PermissionList() {
  const { data: permissions = [], isLoading } = usePermissionsList();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'menu' | 'button' | 'data'>('all');

  const filtered = permissions.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || p.type === typeFilter;
    return matchSearch && matchType;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'menu': return 'primary';
      case 'button': return 'info';
      case 'data': return 'warning';
      default: return 'secondary';
    }
  };

  if (isLoading) return <div className="p-8 text-center text-text-secondary">加载中...</div>;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <Input
            placeholder="搜索权限名称或标识..."
            className="w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-1 bg-surface-subtle p-1 rounded-lg">
            <Button
              variant={typeFilter === 'all' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter('all')}
              className="rounded-md"
            >
              全部
            </Button>
            <Button
              variant={typeFilter === 'menu' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter('menu')}
              className="rounded-md"
            >
              菜单
            </Button>
            <Button
              variant={typeFilter === 'button' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter('button')}
              className="rounded-md"
            >
              按钮
            </Button>
            <Button
              variant={typeFilter === 'data' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter('data')}
              className="rounded-md"
            >
              数据
            </Button>
          </div>
          <Badge variant="secondary">{filtered.length} 项</Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>权限名称</TableHead>
              <TableHead>标识码</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>父级</TableHead>
              <TableHead>路径</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-text-muted py-8">
                  未找到匹配的权限
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {p.icon && <span className="text-sm">{p.icon}</span>}
                      {p.name}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-text-secondary">{p.code}</TableCell>
                  <TableCell>
                    <Badge variant={getTypeColor(p.type)} className="capitalize">
                      {p.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {p.parent_id ? permissions.find(pp => pp.id === p.parent_id)?.name || '-' : '-'}
                  </TableCell>
                  <TableCell className="text-text-secondary">{p.path || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}