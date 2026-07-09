import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from '@/store/store';
import ThemedApp from '@/components/theme/ThemedApp';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemedApp>
        {/* basename follows Vite's `base` so a sub-path deploy (e.g. /mandi) routes correctly. */}
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
          <App />
        </BrowserRouter>
      </ThemedApp>
    </Provider>
  </StrictMode>,
);
