import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import LoadingSpinner from './components/LoadingSpinner';

// Layouts (chargés immédiatement — présents sur toutes les pages)
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages Auth
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Pages Principales
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const MailsPendingPage = lazy(() => import('./pages/mails/MailsPendingPage'));
const MailsProcessedPage = lazy(() => import('./pages/mails/MailsProcessedPage'));
const MailsArchivedPage = lazy(() => import('./pages/mails/MailsArchivedPage'));
const MailDetailPage = lazy(() => import('./pages/mails/MailDetailPage'));
const IncomingMailsPage = lazy(() => import('./pages/mails/IncomingMailsPage'));
const StatisticsPage = lazy(() => import('./pages/stats/StatisticsPage'));

// Pages Courrier Départ
const CreateOutgoingMailPage = lazy(() => import('./pages/outgoing/CreateOutgoingMailPage'));
const OutgoingMailDetailPage = lazy(() => import('./pages/outgoing/OutgoingMailDetailPage'));
const OutgoingMailsDraftPage = lazy(() => import('./pages/outgoing/OutgoingMailsDraftPage'));
const OutgoingMailsSentPage = lazy(() => import('./pages/outgoing/OutgoingMailsSentPage'));
const OutgoingMailsArchivedPage = lazy(() => import('./pages/outgoing/OutgoingMailsArchivedPage'));

// Pages Admin
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const GroupsPage = lazy(() => import('./pages/admin/GroupsPage'));
const ServicesPage = lazy(() => import('./pages/admin/ServicesPage'));
const ContactsPage = lazy(() => import('./pages/admin/SendersPage'));
const SubjectsPage = lazy(() => import('./pages/admin/SubjectsPage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));
const LdapGroupMappingsPage = lazy(() => import('./pages/admin/LdapGroupMappingsPage'));
const BackupPage = lazy(() => import('./pages/admin/BackupPage'));
const OneDriveCallback = lazy(() => import('./pages/OneDriveCallback'));

// Pages Profil
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <LoadingSpinner size="lg" />
  </div>
);

// Composant de route protégée
const ProtectedRoute = ({ children, permissions = [] }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

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
    <Suspense fallback={<PageLoader />}>
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

          {/* Courrier Départ */}
          <Route
            path="/courriers/depart/nouveau"
            element={
              <ProtectedRoute permissions={['create_outgoing']}>
                <CreateOutgoingMailPage />
              </ProtectedRoute>
            }
          />
          <Route path="/courriers/depart/brouillons" element={<OutgoingMailsDraftPage />} />
          <Route path="/courriers/depart/envoyes" element={<OutgoingMailsSentPage />} />
          <Route path="/courriers/depart/archives" element={<OutgoingMailsArchivedPage />} />
          <Route path="/courriers/depart/:id" element={<OutgoingMailDetailPage />} />

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
            path="/admin/contacts"
            element={
              <ProtectedRoute permissions={['view_contacts']}>
                <ContactsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/objets"
            element={
              <ProtectedRoute permissions={['view_contacts']}>
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
          <Route
            path="/admin/correspondances-ldap"
            element={
              <ProtectedRoute permissions={['manage_ldap']}>
                <LdapGroupMappingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/sauvegardes"
            element={
              <ProtectedRoute permissions={['manage_settings']}>
                <BackupPage />
              </ProtectedRoute>
            }
          />

          {/* Callback OAuth OneDrive */}
          <Route path="/settings/onedrive/callback" element={<OneDriveCallback />} />
        </Route>

        {/* Route 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
