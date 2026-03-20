import { describe, expect, it, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { act, renderHook } from '@testing-library/react';
import authReducer, { setSession } from '../src/store/authSlice';
import editorReducer, { openDraft } from '../src/store/editorSlice';
import { FIXTURE_MINIMAL_COURSE } from '@primoria/schema';

const supabaseFns = vi.hoisted(() => ({
  from: vi.fn(),
  courseUpsert: vi.fn(),
  courseUpdateEq: vi.fn(),
  lessonsUpsert: vi.fn(),
  lessonsSelectEq: vi.fn(),
  lessonsDeleteIn: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: supabaseFns.from,
  },
}));

import { useSaveCourse } from '../src/features/editor/hooks/useSaveCourse';
import { usePublish } from '../src/features/editor/hooks/usePublish';

function makeStore() {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      editor: editorReducer,
    },
  });

  store.dispatch(
    setSession({
      user: {
        id: 'author-1',
        email: 'author@primoria.dev',
      } as never,
      session: null,
      role: 'author',
    }),
  );
  store.dispatch(openDraft(FIXTURE_MINIMAL_COURSE));

  return store;
}

function makeWrapper(store: ReturnType<typeof makeStore>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

beforeEach(() => {
  supabaseFns.from.mockReset();
  supabaseFns.courseUpsert.mockReset();
  supabaseFns.courseUpdateEq.mockReset();
  supabaseFns.lessonsUpsert.mockReset();
  supabaseFns.lessonsSelectEq.mockReset();
  supabaseFns.lessonsDeleteIn.mockReset();

  supabaseFns.courseUpsert.mockResolvedValue({ error: null });
  supabaseFns.courseUpdateEq.mockResolvedValue({ error: null });
  supabaseFns.lessonsUpsert.mockResolvedValue({ error: null });
  supabaseFns.lessonsSelectEq.mockResolvedValue({
    data: [{ id: 'lesson-1' }],
    error: null,
  });
  supabaseFns.lessonsDeleteIn.mockResolvedValue({ error: null });

  supabaseFns.from.mockImplementation((table: string) => {
    if (table === 'courses') {
      return {
        upsert: supabaseFns.courseUpsert,
        update: () => ({
          eq: supabaseFns.courseUpdateEq,
        }),
      };
    }

    if (table === 'lessons') {
      return {
        upsert: supabaseFns.lessonsUpsert,
        select: () => ({
          eq: supabaseFns.lessonsSelectEq,
        }),
        delete: () => ({
          in: supabaseFns.lessonsDeleteIn,
        }),
      };
    }

    throw new Error(`Unexpected table access: ${table}`);
  });
});

describe('course save and publish flows', () => {
  it('saveCourse rejects when remote persistence fails', async () => {
    const store = makeStore();
    const wrapper = makeWrapper(store);
    supabaseFns.courseUpsert.mockResolvedValueOnce({ error: new Error('save failed') });

    const { result } = renderHook(() => useSaveCourse(), { wrapper });

    await expect(result.current.saveCourse()).rejects.toThrow('save failed');
  });

  it('publish aborts before status update when save fails', async () => {
    const store = makeStore();
    const wrapper = makeWrapper(store);
    const saveCourse = vi.fn().mockRejectedValue(new Error('save failed'));

    const { result } = renderHook(() => usePublish(saveCourse), { wrapper });

    let publishResult: Awaited<ReturnType<typeof result.current.publish>> | null = null;
    await act(async () => {
      publishResult = await result.current.publish();
    });

    expect(saveCourse).toHaveBeenCalledTimes(1);
    expect(supabaseFns.courseUpdateEq).not.toHaveBeenCalled();
    expect(publishResult).toEqual({
      success: false,
      serverError: 'Error: save failed',
    });
  });
});
