import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppProviders } from './app/providers'
import './style.css'

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <AppProviders />
  </React.StrictMode>,
)
