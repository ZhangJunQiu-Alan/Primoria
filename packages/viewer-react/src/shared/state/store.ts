import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import authReducer from '@/features/auth/authSlice';
import editorReducer from '@/store/editorSlice';
import preferencesReducer, { saveViewerPreferences } from '@/shared/state/preferencesSlice';

export function createAppStore() {
  const appStore = configureStore({
    reducer: {
      auth: authReducer,
      editor: editorReducer,
      viewerPreferences: preferencesReducer,
    },
  });

  appStore.subscribe(() => {
    saveViewerPreferences(appStore.getState().viewerPreferences);
  });

  return appStore;
}

export const store = createAppStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
