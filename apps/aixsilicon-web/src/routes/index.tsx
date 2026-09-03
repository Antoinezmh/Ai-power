import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Dashboard from '../pages/Dashboard';
import ToolMarket from '../pages/ToolMarket/index';
import AIChat from '../pages/AIChat';
import PermissionManagement from '../pages/PermissionManagement/index';
import Settings from '../pages/Settings/index';
import Login from '../pages/Login';
import Categories from '@/pages/Categories';
import FileCenter from '@/pages/FileCenter';
import FilePicker from '@/pages/FilePicker';
import RouteGuard from '@/components/RouteGuard';
import Landing from '@/pages/Landing';
import CapabilityCenter from '@/pages/CapabilityCenter';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/files/picker" element={<FilePicker />} />
      <Route path="/" element={<Landing />} />
      <Route element={<MainLayout />}>
        <Route path="dashboard" element={<RouteGuard code="button:dashboard:view"><Dashboard /></RouteGuard>} />
        <Route path="capabilities/spec" element={<CapabilityCenter moduleId="spec" />} />
        <Route path="capabilities/model" element={<CapabilityCenter moduleId="model" />} />
        <Route path="capabilities/test" element={<CapabilityCenter moduleId="test" />} />
        <Route path="capabilities/reliability" element={<CapabilityCenter moduleId="reliability" />} />
        <Route path="files" element={<RouteGuard code="menu:files"><FileCenter /></RouteGuard>} />
        <Route path="tools" element={<RouteGuard code="button:tools:view"><ToolMarket /></RouteGuard>} />
        <Route path="chat" element={<RouteGuard code="menu:chat"><AIChat /></RouteGuard>} />
        <Route path="permissions" element={<RouteGuard code="button:permissions:view"><PermissionManagement /></RouteGuard>} />
        <Route path="settings" element={<RouteGuard code="button:settings:view"><Settings /></RouteGuard>} />
        <Route path="categories" element={<RouteGuard code="menu:categories"><Categories /></RouteGuard>} />
      </Route>
    </Routes>
  );
}
