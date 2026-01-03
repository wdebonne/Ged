import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages Auth
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Pages Principales
import DashboardPage from './pages/dashboard/DashboardPage';
import MailsPendingPage from './pages/mails/MailsPendingPage';
import MailsProcessedPage from './pages/mails/MailsProcessedPage';
import MailsArchivedPage from './pages/mails/MailsArchivedPage';
import MailDetailPage from './pages/mails/MailDetailPage';
import IncomingMailsPage from './pages/mails/IncomingMailsPage';
import StatisticsPage from './pages/stats/StatisticsPage';

// Pages Admin
import UsersPage from './pages/admin/UsersPage';
import GroupsPage from './pages/admin/GroupsPage';
import ServicesPage from './pages/admin/ServicesPage';
import SendersPage from './pages/admin/SendersPage';
import SubjectsPage from './pages/admin/SubjectsPage';
import SettingsPage from './pages/admin/SettingsPage';
import OneDriveCallback from './pages/OneDriveCallback';

// Pages Profil
import ProfilePage from './pages/profile/ProfilePage';

// Composant de route protégée
const ProtectedRoute = ({ children, permissions = [] }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Vérifier les permissions si spécifiées
  if (permissions.length > 0 && user?.group?.permissions) {
    const hasPermission = permissions.some(p => user.group.permissions.includes(p));
    if (!hasPermission) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

// Composant de route publique (redirige si connecté)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      {/* Routes d'authentification */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password/:token"
          element={
            <PublicRoute>
              <ResetPasswordPage />
            </PublicRoute>
          }
        />
      </Route>

      {/* Routes principales protégées */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        
        {/* Courriers */}
        <Route 
          path="/courriers/entrants" 
          element={
            <ProtectedRoute permissions={['import_mails']}>
              <IncomingMailsPage />
            </ProtectedRoute>
          } 
        />
        <Route path="/courriers/a-traiter" element={<MailsPendingPage />} />
        <Route path="/courriers/traites" element={<MailsProcessedPage />} />
        <Route path="/courriers/archives" element={<MailsArchivedPage />} />
        <Route path="/courriers/:id" element={<MailDetailPage />} />
        
        {/* Statistiques */}
        <Route path="/statistiques" element={<StatisticsPage />} />
        
        {/* Profil */}
        <Route path="/profil" element={<ProfilePage />} />
        
        {/* Administration */}
        <Route
          path="/admin/utilisateurs"
          element={
            <ProtectedRoute permissions={['view_users']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/groupes"
          element={
            <ProtectedRoute permissions={['view_groups']}>
              <GroupsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/services"
          element={
            <ProtectedRoute permissions={['view_services']}>
              <ServicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/expediteurs"
          element={
            <ProtectedRoute permissions={['view_senders']}>
              <SendersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/objets"
          element={
            <ProtectedRoute permissions={['view_senders']}>
              <SubjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/parametres"
          element={
            <ProtectedRoute permissions={['view_settings']}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        
        {/* Callback OAuth OneDrive */}
        <Route path="/settings/onedrive/callback" element={<OneDriveCallback />} />
      </Route>

      {/* Route 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
