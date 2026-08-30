import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '@/api/apiSlice';
import authReducer from './authSlice';
import appearanceReducer from './appearanceSlice';
import khataReducer from '@/features/khata/khataSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    appearance: appearanceReducer,
    khata: khataReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefault) => getDefault().concat(apiSlice.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
