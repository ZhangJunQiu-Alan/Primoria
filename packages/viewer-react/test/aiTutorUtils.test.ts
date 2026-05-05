import {
  AI_TUTOR_LEGACY_SESSION_STORAGE_KEY,
  AI_TUTOR_SESSION_STORAGE_KEY,
  clearAiTutorSessionStorage,
} from '@/features/ai-tutor/aiTutorUtils';

describe('aiTutorUtils', () => {
  afterEach(() => {
    window.localStorage.removeItem(AI_TUTOR_SESSION_STORAGE_KEY);
    window.localStorage.removeItem(AI_TUTOR_LEGACY_SESSION_STORAGE_KEY);
  });

  it('clears both current and legacy tutor session storage keys', () => {
    window.localStorage.setItem(AI_TUTOR_SESSION_STORAGE_KEY, 'current');
    window.localStorage.setItem(AI_TUTOR_LEGACY_SESSION_STORAGE_KEY, 'legacy');

    clearAiTutorSessionStorage();

    expect(window.localStorage.getItem(AI_TUTOR_SESSION_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(AI_TUTOR_LEGACY_SESSION_STORAGE_KEY)).toBeNull();
  });
});
