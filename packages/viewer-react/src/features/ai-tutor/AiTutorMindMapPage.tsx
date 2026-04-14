import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AiTutorMindMapView } from '@/features/ai-tutor/AiTutorMindMapView';
import { readLegacyMindMapModal } from '@/features/ai-tutor/mindMapLegacySession';
import { listMindMaps } from '@/shared/api/viewer/tutorDocumentsApi';
import { useProductLanguage } from '@/shared/i18n/useProductLanguage';
import { useAppSelector } from '@/shared/state/store';

function pageCopy(language: 'zh-CN' | 'en') {
  if (language === 'zh-CN') {
    return {
      back: '返回 AI 导师',
      loading: '正在打开最近的思维导图…',
      empty: '还没有可打开的思维导图。',
    };
  }

  return {
    back: 'Back to AI Tutor',
    loading: 'Opening your latest mind map…',
    empty: 'No saved mind maps are available yet.',
  };
}

export function AiTutorMindMapPage() {
  const language = useProductLanguage();
  const labels = pageCopy(language);
  const navigate = useNavigate();
  const userId = useAppSelector((state) => state.auth.user?.id ?? null);
  const legacyModal = readLegacyMindMapModal();

  const mindMapsQuery = useQuery({
    queryKey: ['ai-tutor', 'mindmaps', userId ?? 'anon'],
    enabled: Boolean(userId),
    queryFn: listMindMaps,
    staleTime: 30_000,
  });

  useEffect(() => {
    const latestMindMap = mindMapsQuery.data?.[0];
    if (!latestMindMap) {
      return;
    }

    navigate(`/ai-tutor/mindmap/${latestMindMap.id}`, { replace: true });
  }, [mindMapsQuery.data, navigate]);

  if (!userId) {
    return <Navigate to="/ai-tutor" replace />;
  }

  if (mindMapsQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-3 text-sm font-medium text-[#8b7d72]">
        <LoaderCircle size={18} className="animate-spin" />
        {labels.loading}
      </div>
    );
  }

  if (mindMapsQuery.data?.length) {
    return null;
  }

  if (!legacyModal) {
    return <Navigate to="/ai-tutor" replace />;
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[1480px] flex-col overflow-hidden px-4 py-4 md:px-5">
      <div className="flex items-center justify-between rounded-[24px] border border-[#ddd3c3] bg-[rgba(255,252,247,0.92)] px-4 py-3 shadow-[0_10px_24px_rgba(90,70,50,0.08)]">
        <Link to="/ai-tutor" className="viewer-botanical-button viewer-botanical-button--secondary">
          <span className="flex items-center gap-2">
            <ArrowLeft size={16} />
            {labels.back}
          </span>
        </Link>
      </div>

      <section className="viewer-surface mt-4 min-h-0 flex-1 overflow-hidden bg-[rgba(254,250,245,0.94)] p-5 md:p-6">
        <AiTutorMindMapView root={legacyModal.payload.root} />
      </section>
    </div>
  );
}
