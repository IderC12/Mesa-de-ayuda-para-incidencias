import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { createRepository } from './Infrastructure/repository.js';
import { HelpdeskProvider } from './Presentation/Context/HelpdeskProvider.jsx';
import { useHelpdesk } from './Presentation/Context/HelpdeskContext.js';
import { ErrorBoundary } from './Presentation/Components/ErrorBoundary.jsx';
import { Shell } from './Presentation/Components/Shell.jsx';
import { Loading } from './Presentation/Components/UI.jsx';
import AuthPage from './Presentation/Pages/AuthPage.jsx';
import DashboardPage from './Presentation/Pages/DashboardPage.jsx';
import TicketsPage from './Presentation/Pages/TicketsPage.jsx';
import TicketDetailPage from './Presentation/Pages/TicketDetailPage.jsx';
import NewTicketPage from './Presentation/Pages/NewTicketPage.jsx';
import CategoriesPage from './Presentation/Pages/CategoriesPage.jsx';
import UsersPage from './Presentation/Pages/UsersPage.jsx';
import ReportsPage from './Presentation/Pages/ReportsPage.jsx';
import SettingsPage from './Presentation/Pages/SettingsPage.jsx';
import NotFoundPage from './Presentation/Pages/NotFoundPage.jsx';
import './Presentation/Styles/global.css';
function ProtectedRoute({ children, staff = false }) {
  const { user, authLoading } = useHelpdesk();
  if (authLoading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (staff && user.role === 'requester') return <Navigate to="/dashboard" replace />;
  return children;
}
function Bootstrap() {
  const [repository] = useState(createRepository);
  return (
    <BrowserRouter>
      <HelpdeskProvider repository={repository}>
        <Routes>
          <Route path="/login" element={<AuthPage key="login" />} />
          <Route path="/register" element={<AuthPage key="register" mode="register" />} />
          <Route path="/forgot-password" element={<AuthPage key="forgot" mode="forgot" />} />
          <Route path="/reset-password" element={<AuthPage key="reset" mode="reset" />} />
          <Route
            element={
              <ProtectedRoute>
                <Shell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="tickets/new" element={<NewTicketPage />} />
            <Route path="tickets/:id" element={<TicketDetailPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route
              path="users"
              element={
                <ProtectedRoute staff>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="reports"
              element={
                <ProtectedRoute staff>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HelpdeskProvider>
    </BrowserRouter>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <Bootstrap />
    </ErrorBoundary>
  );
}
