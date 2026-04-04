import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ViewerAuthUser = {
  id: string;
  email: string;
  displayName: string;
};

export type ViewerAuthState = {
  user: ViewerAuthUser | null;
  role: string | null;
  loading: boolean;
  source: 'supabase' | 'demo' | null;
};

const initialState: ViewerAuthState = {
  user: null,
  role: null,
  loading: true,
  source: null,
};

const authSlice = createSlice({
  name: 'viewerAuth',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setSession(
      state,
      action: PayloadAction<{
        user: ViewerAuthUser;
        role: string | null;
        source: ViewerAuthState['source'];
      }>,
    ) {
      state.user = action.payload.user;
      state.role = action.payload.role;
      state.source = action.payload.source;
      state.loading = false;
    },
    clearSession(state) {
      state.user = null;
      state.role = null;
      state.source = null;
      state.loading = false;
    },
  },
});

export const { clearSession, setLoading, setSession } = authSlice.actions;
export default authSlice.reducer;

