import { apiSlice } from './apiSlice';

export interface VoiceCommandResult {
  transcript: string;
  intent: 'navigate' | 'record_collection' | 'record_expense' | 'record_cash_transfer' | 'none';
  action: 'navigate' | 'created' | 'none';
  path?: string;
  message: string;
}

export const voiceApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    sendVoiceCommand: build.mutation<VoiceCommandResult, { audio?: string; mimeType?: string; text?: string }>({
      query: (body) => ({ url: '/voice/command', method: 'POST', body }),
      // A voice command may create a collection/expense/transfer — refresh
      // everything those touch.
      invalidatesTags: ['Collection', 'Expense', 'CashTransfer', 'BankAccount', 'Outstanding', 'Dashboard'],
    }),
  }),
});

export const { useSendVoiceCommandMutation } = voiceApi;
