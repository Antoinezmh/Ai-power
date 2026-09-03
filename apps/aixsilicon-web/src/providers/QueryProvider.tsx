import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1分钟内数据视为新鲜，不会重新请求
      gcTime: 5 * 60 * 1000, // 缓存保留5分钟
      refetchOnMount: false, // 组件挂载时不自动重新请求（除非数据已过期）
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}