import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Discord App Error Caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-[#1e1f22] text-[#dbdee1] p-6">
          <div className="max-w-md bg-[#2b2d31] p-8 rounded-xl border border-[#3f4147] text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-[#f23f43]/20 text-[#f23f43] flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              !
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-xs text-[#949ba4] mb-4">
              {this.state.error?.message || 'An unexpected error occurred while loading the messenger.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-semibold px-6 py-2 rounded transition"
            >
              Reload Fragment
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
