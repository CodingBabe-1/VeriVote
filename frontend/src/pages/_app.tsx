/**
 * _app.tsx — Root application component.
 * Wraps all pages with global styles and layout.
 */
import React from 'react';
import type { AppProps } from 'next/app';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className="app">
      <Component {...pageProps} />
    </div>
  );
}
