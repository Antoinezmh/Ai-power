import { businessFlows } from '@/features/workflows/catalog';
import { Navigate, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import MainLayout from '../layouts/MainLayout';
import RouteGuard from '@/components/RouteGuard';

const Dashboard = lazy(() => import('../pages/Dashboard'));
const ToolMarket = lazy(() => import('../pages/ToolMarket'));
const AIChat = lazy(() => import('../pages/AIChat'));
const PermissionManagement = lazy(() => import('../pages/PermissionManagement'));
const Settings = lazy(() => import('../pages/Settings'));
const Login = lazy(() => import('../pages/Login'));
const Categories = lazy(() => import('@/pages/Categories'));
const FileCenter = lazy(() => import('@/pages/FileCenter'));
const FilePicker = lazy(() => import('@/pages/FilePicker'));
const Landing = lazy(() => import('@/pages/Landing'));
const CapabilityCenter = lazy(() => import('@/pages/CapabilityCenter'));
const ProjectWorkspace = lazy(() => import('@/pages/ProjectWorkspace'));

export default function AppRouter() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-surface text-sm text-text-secondary">正在加载工作台…</div>}>
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/files/picker" element={<FilePicker />} />
      <Route path="/" element={<Landing />} />
      <Route element={<MainLayout />}>
        <Route path="dashboard" element={<RouteGuard code="button:dashboard:view"><Dashboard /></RouteGuard>} />
        {businessFlows.map(flow => <Route key={flow.id} path={`capabilities/${flow.id}`} element={<CapabilityCenter moduleId={flow.id} />} />)}
        <Route path="capabilities/projects" element={<ProjectWorkspace />} />
        <Route path="projects" element={<Navigate replace to="/capabilities/projects" />} />
        <Route path="capabilities/spec" element={<Navigate replace to="/capabilities/requirements" />} />
        <Route path="capabilities/model" element={<Navigate replace to="/capabilities/design" />} />
        <Route path="capabilities/test" element={<Navigate replace to="/capabilities/validation" />} />
        <Route path="files" element={<RouteGuard code="menu:files"><FileCenter /></RouteGuard>} />
        <Route path="tools" element={<RouteGuard code="button:tools:view"><ToolMarket /></RouteGuard>} />
        <Route path="chat" element={<RouteGuard code="menu:chat"><AIChat /></RouteGuard>} />
        <Route path="permissions" element={<RouteGuard code="button:permissions:view"><PermissionManagement /></RouteGuard>} />
        <Route path="settings" element={<RouteGuard code="button:settings:view"><Settings /></RouteGuard>} />
        <Route path="categories" element={<RouteGuard code="menu:categories"><Categories /></RouteGuard>} />
      </Route>
      </Routes>
    </Suspense>
  );
}
