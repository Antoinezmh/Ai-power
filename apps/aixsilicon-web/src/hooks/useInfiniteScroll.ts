import { useEffect, useRef, useState, useCallback } from 'react';

interface UseInfiniteScrollOptions<T> {
    fetchMore: (page: number) => Promise<T[]>;
    pageSize?: number;
    deps?: any[];
}

export function useInfiniteScroll<T>({
    fetchMore,
    pageSize = 6,
    deps = [],
}: UseInfiniteScrollOptions<T>) {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [initialLoading, setInitialLoading] = useState(true); // 新增：首次加载状态
    const pageRef = useRef(1);
    const abortControllerRef = useRef<AbortController | null>(null);
    const observerRef = useRef<HTMLDivElement>(null);
    const isResetRef = useRef(false);
    const isMounted = useRef(true);

    const loadMore = useCallback(async (isInitial = false) => {
        if (loading || (!hasMore && !isInitial)) return;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);
        if (isInitial) setInitialLoading(true);
        try {
            const newItems = await fetchMore(pageRef.current);
            if (controller.signal.aborted || !isMounted.current) return;
            if (newItems.length === 0) {
                setHasMore(false);
            } else {
                setItems(prev => {
                    // 如果是首次加载或重置后，直接替换
                    if (isInitial || pageRef.current === 1) {
                        return newItems;
                    }
                    return [...prev, ...newItems];
                });
                pageRef.current += 1;
                if (newItems.length < pageSize) {
                    setHasMore(false);
                }
            }
        } catch (err) {
            if (!controller.signal.aborted && isMounted.current) {
                setError(err as Error);
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
                setInitialLoading(false);
            }
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, [fetchMore, loading, hasMore, pageSize]);

    const reset = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        isResetRef.current = true;
        setItems([]);
        setHasMore(true);
        setError(null);
        pageRef.current = 1;
        setLoading(false);
        setInitialLoading(true);
        setTimeout(() => {
            isResetRef.current = false;
        }, 50);
    }, []);

    // 当 deps 变化时重置并加载第一页
    useEffect(() => {
        reset();
        const timer = setTimeout(() => {
            loadMore(true);
        }, 100);
        return () => clearTimeout(timer);
    }, deps);

    // 设置 IntersectionObserver
    useEffect(() => {
        if (!observerRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loading && hasMore && !initialLoading) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(observerRef.current);
        return () => observer.disconnect();
    }, [loadMore, loading, hasMore, initialLoading]);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    return {
        items,
        loading,
        hasMore,
        error,
        initialLoading,
        reset,
        loadMore,
        observerRef,
    };
}