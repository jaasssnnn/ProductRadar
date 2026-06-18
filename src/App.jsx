import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/layout/Layout';
import UploadPage from './pages/UploadPage';
import DashboardPage from './pages/DashboardPage';
import AccountDetailPage from './pages/AccountDetailPage';
import InsightsPage from './pages/InsightsPage';
import ChangesPage from './pages/ChangesPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/account/:customerId" element={<AccountDetailPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/changes" element={<ChangesPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
