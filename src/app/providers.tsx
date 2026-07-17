import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'
import { AppRouter } from './router'

export function AppProviders() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRouter />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: '1rem',
              background: '#111827',
              color: '#f9fafb',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
