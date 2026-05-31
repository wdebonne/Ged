import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

const getErrorMessage = (error) =>
  error?.response?.data?.message || 'Une erreur est survenue';

const shouldSkip = (error) => {
  const status = error?.response?.status;
  // 401 → redirigé vers /login par l'intercepteur axios
  // 5xx → toast déjà affiché par l'intercepteur axios
  return !status || status === 401 || status >= 500;
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (shouldSkip(error)) return;
      toast.error(getErrorMessage(error));
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Ne pas doubler le toast si la mutation gère déjà ses erreurs
      if (mutation.options.onError) return;
      if (shouldSkip(error)) return;
      toast.error(getErrorMessage(error));
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
