import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser, LoginResponse } from '@/types';

const TOKEN_KEY = 'mandi.token';
const USER_KEY = 'mandi.user';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
}

function loadInitial(): AuthState {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    return {
      token,
      user: userRaw ? (JSON.parse(userRaw) as AuthUser) : null,
    };
  } catch {
    return { token: null, user: null };
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: loadInitial(),
  reducers: {
    setCredentials(state, action: PayloadAction<LoginResponse>) {
      state.token = action.payload.accessToken;
      state.user = action.payload.user;
      localStorage.setItem(TOKEN_KEY, action.payload.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user));
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload));
    },
    logout(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
  },
});

export const { setCredentials, setUser, logout } = authSlice.actions;
export default authSlice.reducer;
