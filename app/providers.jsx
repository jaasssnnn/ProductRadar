'use client';
import { AppProvider } from '@/src/context/AppContext';
export default function Providers({ children }) {
  return <AppProvider>{children}</AppProvider>;
}
