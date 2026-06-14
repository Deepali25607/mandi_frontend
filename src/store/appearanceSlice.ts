import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_APPEARANCE, type AppearanceConfig } from '@/types/appearance';

const KEY = 'mandi.appearance';

interface AppearanceState {
  config: AppearanceConfig;
}

function loadInitial(): AppearanceState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { config: { ...DEFAULT_APPEARANCE, ...JSON.parse(raw) } };
  } catch {
    /* ignore corrupt cache */
  }
  return { config: DEFAULT_APPEARANCE };
}

const appearanceSlice = createSlice({
  name: 'appearance',
  initialState: loadInitial(),
  reducers: {
    // Apply (and cache) a full appearance config — used both for live preview
    // and after loading/saving the tenant's stored theme.
    setAppearance(state, action: PayloadAction<AppearanceConfig>) {
      state.config = action.payload;
      try {
        localStorage.setItem(KEY, JSON.stringify(action.payload));
      } catch {
        /* storage full / unavailable — theme still applies in-memory */
      }
    },
    resetAppearance(state) {
      state.config = DEFAULT_APPEARANCE;
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
    },
  },
});

export const { setAppearance, resetAppearance } = appearanceSlice.actions;
export default appearanceSlice.reducer;
