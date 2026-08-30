import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * Device-local Khata preferences. Ledger data itself comes from the ERP API;
 * only the per-party collection reminder date (which has no backend field
 * yet) is kept here, cached in localStorage.
 */
const KEY = 'mandi.khata.prefs';

export interface KhataState {
  /** partyId → yyyy-mm-dd */
  reminders: Record<string, string>;
}

function loadInitial(): KhataState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<KhataState>;
      if (parsed.reminders && typeof parsed.reminders === 'object') return { reminders: parsed.reminders };
    }
  } catch {
    /* corrupt cache → start clean */
  }
  return { reminders: {} };
}

function persist(state: KhataState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — state still lives in memory */
  }
}

const khataSlice = createSlice({
  name: 'khata',
  initialState: loadInitial(),
  reducers: {
    setReminder(state, action: PayloadAction<{ partyId: string; date?: string }>) {
      if (action.payload.date) state.reminders[action.payload.partyId] = action.payload.date;
      else delete state.reminders[action.payload.partyId];
      persist(state);
    },
  },
});

export const { setReminder } = khataSlice.actions;
export default khataSlice.reducer;
