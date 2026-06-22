import { useState, useEffect, useMemo } from 'react';
import { Outlet, NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import useBrandingStore from '../stores/brandingStore';
import { useQuery } from '@tanstack/react-query';
import { statsAPI } from '../services/api';
import UserMenu from '../components/UserMenu';
import ChatBotButton from '../components/ChatBotButton';
import {
  HomeIcon,
  InboxIcon,
  CheckCircleIcon,
  ArchiveBoxIcon,
  UsersIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  UserPlusIcon,
  TagIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChartBarIcon,
  LinkIcon,
  CircleStackIcon,
  PaperAirplaneIcon,
  PlusIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { appName, appVersion, appLogo, footerText, footerVisible, fetchBranding, isLoaded } = useBrandingStore();
  
  // Charger les paramètres de branding au montage
  useEffect(() => {
    if (!isLoaded) {
      fetchBranding();
    }
  }, [isLoaded, fetchBranding]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mesCourrierOpen, setMesCourrierOpen] = useState(true);
  const [delegatedOpen, setDelegatedOpen] = useState(true);
  const [importOpen, setImportOpen] = useState(true);
  const [courrierDepartOpen, setCourrierDepartOpen] = useState(true);
  const [serviceOpen, setServiceOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(true);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, logout, hasPermission, canImport } = useAuthStore();

  // Fonction pour vérifier si un lien est actif (prend en compte le scope)
  const isLinkActive = (href) => {
    const [path, queryString] = href.split('?');
    const currentPath = location.pathname;
    const currentScope = searchParams.get('scope');
    
    // Vérifier si le chemin correspond
    if (currentPath !== path) return false;
    
    // Si le lien a un scope, vérifier qu'il correspond
    if (queryString) {
      const linkParams = new URLSearchParams(queryString);
      const linkScope = linkParams.get('scope');
      if (linkScope && linkScope !== currentScope) return false;
    }
    
    return true;
  };

  // Récupérer les stats pour le badge d'import
  const { data: statsData } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const response = await statsAPI.getStats();
      return response.data.data;
    },
    refetchInterval: 60000 // Rafraîchir toutes les 60 secondes
  });

  // Fermer la sidebar sur navigation mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Lien Tableau de bord séparé
  const dashboardLink = { name: 'Tableau de bord', href: '/', icon: HomeIcon };

  // Lien Statistiques
  const statsLink = { name: 'Statistiques', href: '/statistiques', icon: ChartBarIcon };

  // Navigation Mes courriers (où je suis destinataire)
  const mesCourrierNavigation = [
    { name: 'À traiter', href: '/courriers/a-traiter?scope=mine', icon: InboxIcon, badge: statsData?.my?.pending },
    { name: 'Traités', href: '/courriers/traites?scope=mine', icon: CheckCircleIcon, badge: statsData?.my?.processed },
    { name: 'Archivés', href: '/courriers/archives?scope=mine', icon: ArchiveBoxIcon },
  ];

  // Navigation Courriers Délégués (visible uniquement si l'utilisateur a des délégations actives)
  const hasDelegations = statsData?.delegated && (statsData.delegated.pending > 0 || statsData.delegated.processed > 0 || statsData.delegated.archived > 0);
  const delegatedCourrierNavigation = hasDelegations ? [
    { name: 'À traiter', href: '/courriers/a-traiter?scope=delegated', icon: InboxIcon, badge: statsData?.delegated?.pending },
    { name: 'Traités', href: '/courriers/traites?scope=delegated', icon: CheckCircleIcon, badge: statsData?.delegated?.processed },
    { name: 'Archivés', href: '/courriers/archives?scope=delegated', icon: ArchiveBoxIcon },
  ] : [];

  // Navigation Courriers Service(s) (pour utilisateurs avec services ET permission OU superviseur)
  const userHasServices = user?.services?.length > 0;
  const canViewServiceMails = hasPermission('view_service_mails');
  const userId = user?._id?.toString?.() || user?._id || user?.id;
  const isServiceSupervisor = user?.services?.some(s => {
    const ids = (s.supervisors || []).map(sup => sup?._id?.toString?.() || sup?._id || sup?.toString?.() || sup);
    return ids.some(id => id && userId && String(id) === String(userId));
  });
  const canAccessServiceMails = userHasServices && (canViewServiceMails || isServiceSupervisor);
  const serviceCourrierNavigation = canAccessServiceMails ? [
    { name: 'À traiter', href: '/courriers/a-traiter?scope=service', icon: InboxIcon, badge: statsData?.service?.pending },
    { name: 'Traités', href: '/courriers/traites?scope=service', icon: CheckCircleIcon, badge: statsData?.service?.processed },
    { name: 'Archivés', href: '/courriers/archives?scope=service', icon: ArchiveBoxIcon },
  ] : [];

  // Navigation pour les utilisateurs pouvant importer
  const importNavigation = canImport() ? [
    { name: 'Courriers entrants', href: '/courriers/entrants', icon: ArrowDownTrayIcon, permission: 'import_mails', badge: statsData?.pendingImport },
  ] : [];

  // Navigation Courrier Départ
  const outgoingNavigation = [
    { name: 'Nouveau', href: '/courriers/depart/nouveau', icon: PlusIcon, permission: 'create_outgoing' },
    { name: 'Brouillons', href: '/courriers/depart/brouillons', icon: DocumentTextIcon, badge: statsData?.outgoing?.draft },
    { name: 'Envoyés', href: '/courriers/depart/envoyes', icon: PaperAirplaneIcon, badge: statsData?.outgoing?.sent },
    { name: 'Archivés', href: '/courriers/depart/archives', icon: ArchiveBoxIcon },
  ];

  const adminNavigation = [
    { name: 'Utilisateurs', href: '/admin/utilisateurs', icon: UsersIcon, permission: 'view_users' },
    { name: 'Groupes', href: '/admin/groupes', icon: UserGroupIcon, permission: 'view_groups' },
    { name: 'Services', href: '/admin/services', icon: BuildingOfficeIcon, permission: 'view_services' },
    { name: 'Contacts', href: '/admin/contacts', icon: UserPlusIcon, permission: 'view_contacts' },
    { name: 'Objets', href: '/admin/objets', icon: TagIcon, permission: 'view_contacts' },
    { name: 'Paramètres', href: '/admin/parametres', icon: Cog6ToothIcon, permission: 'view_settings' },
    { name: 'Sauvegardes', href: '/admin/sauvegardes', icon: CircleStackIcon, permission: 'manage_settings' },
    { name: 'Correspondances LDAP', href: '/admin/correspondances-ldap', icon: LinkIcon, permission: 'manage_ldap' },
  ];

  const filteredAdminNav = useMemo(
    () => adminNavigation.filter(item => hasPermission(item.permission)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.group?.permissions]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 transform transition-all duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'} w-64`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`flex items-center gap-3 px-4 py-5 border-b border-gray-100 ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}>
            {appLogo ? (
              <img 
                src={`/uploads/${appLogo}`} 
                alt={appName} 
                className="w-10 h-10 rounded-xl object-contain flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" viewBox="0 0 100 100" fill="currentColor">
                  <rect x="10" y="15" width="80" height="70" rx="5" />
                </svg>
              </div>
            )}
            {!sidebarCollapsed && (
              <div className="lg:block">
                <h1 className="text-lg font-bold text-gray-900">{appName}</h1>
                <p className="text-xs text-gray-500">{appVersion}</p>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto lg:hidden p-1 text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${sidebarCollapsed ? 'lg:px-2' : 'px-3'}`}>
            {/* Tableau de bord - Toujours visible en haut */}
            <NavLink
              to={dashboardLink.href}
              title={sidebarCollapsed ? dashboardLink.name : undefined}
              className={({ isActive }) =>
                `${isActive ? 'sidebar-link-active' : 'sidebar-link'} ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`
              }
            >
              <dashboardLink.icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="flex-1 lg:inline">{dashboardLink.name}</span>}
            </NavLink>

            {/* Statistiques */}
            <NavLink
              to={statsLink.href}
              title={sidebarCollapsed ? statsLink.name : undefined}
              className={({ isActive }) =>
                `${isActive ? 'sidebar-link-active' : 'sidebar-link'} ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`
              }
            >
              <statsLink.icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="flex-1 lg:inline">{statsLink.name}</span>}
            </NavLink>

            {/* Courriers entrants - Pour Admin/Archivistes */}
            {importNavigation.length > 0 && (
              <div className="pt-3">
                {!sidebarCollapsed ? (
                  <button
                    onClick={() => setImportOpen(!importOpen)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                  >
                    {importOpen ? (
                      <ChevronDownIcon className="w-4 h-4" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4" />
                    )}
                    <span>Import</span>
                  </button>
                ) : (
                  <div className="hidden lg:block border-t border-gray-200 my-2"></div>
                )}
                <AnimatePresence initial={false}>
                  {(importOpen || sidebarCollapsed) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {importNavigation.map((item) => (
                        <NavLink
                          key={item.name}
                          to={item.href}
                          title={sidebarCollapsed ? item.name : undefined}
                          className={({ isActive }) =>
                            `${isActive ? 'sidebar-link-active' : 'sidebar-link'} ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`
                          }
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          {!sidebarCollapsed && <span className="flex-1 lg:inline">{item.name}</span>}
                          {item.badge > 0 && !sidebarCollapsed && (
                            <span className="bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Courrier Départ */}
            {(hasPermission('view_own_outgoing') || hasPermission('view_all_outgoing') || hasPermission('create_outgoing')) && (
              <div className="pt-3">
                {!sidebarCollapsed ? (
                  <button
                    onClick={() => setCourrierDepartOpen(!courrierDepartOpen)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                  >
                    {courrierDepartOpen ? (
                      <ChevronDownIcon className="w-4 h-4" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4" />
                    )}
                    <span>Courrier Départ</span>
                  </button>
                ) : (
                  <div className="hidden lg:block border-t border-gray-200 my-2"></div>
                )}
                <AnimatePresence initial={false}>
                  {(courrierDepartOpen || sidebarCollapsed) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {outgoingNavigation
                        .filter(item => !item.permission || hasPermission(item.permission))
                        .map((item) => (
                          <NavLink
                            key={item.name + item.href}
                            to={item.href}
                            title={sidebarCollapsed ? item.name : undefined}
                            className={({ isActive }) =>
                              `${isActive ? 'sidebar-link-active' : 'sidebar-link'} ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`
                            }
                          >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            {!sidebarCollapsed && <span className="flex-1 lg:inline">{item.name}</span>}
                            {item.badge > 0 && !sidebarCollapsed && (
                              <span className="bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </NavLink>
                        ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Mes courriers - Section collapsible */}
            <div className="pt-3">
              {!sidebarCollapsed ? (
                <button
                  onClick={() => setMesCourrierOpen(!mesCourrierOpen)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                >
                  {mesCourrierOpen ? (
                    <ChevronDownIcon className="w-4 h-4" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4" />
                  )}
                  <span>Mes courriers</span>
                </button>
              ) : (
                <div className="hidden lg:block border-t border-gray-200 my-2"></div>
              )}
              <AnimatePresence initial={false}>
                {(mesCourrierOpen || sidebarCollapsed) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {mesCourrierNavigation.map((item) => (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        title={sidebarCollapsed ? item.name : undefined}
                        className={() =>
                          `${isLinkActive(item.href) ? 'sidebar-link-active' : 'sidebar-link'} ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`
                        }
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!sidebarCollapsed && <span className="flex-1 lg:inline">{item.name}</span>}
                        {item.badge !== undefined && item.badge > 0 && !sidebarCollapsed && (
                          <span className="bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Courriers Délégués */}
            {delegatedCourrierNavigation.length > 0 && (
              <div className="pt-3">
                {!sidebarCollapsed ? (
                  <button
                    onClick={() => setDelegatedOpen(!delegatedOpen)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                  >
                    {delegatedOpen ? (
                      <ChevronDownIcon className="w-4 h-4" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4" />
                    )}
                    <span>Courriers Délégués</span>
                  </button>
                ) : (
                  <div className="hidden lg:block border-t border-gray-200 my-2"></div>
                )}
                <AnimatePresence initial={false}>
                  {(delegatedOpen || sidebarCollapsed) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {delegatedCourrierNavigation.map((item) => (
                        <NavLink
                          key={item.name + '-delegated'}
                          to={item.href}
                          title={sidebarCollapsed ? item.name : undefined}
                          className={() =>
                            `${isLinkActive(item.href) ? 'sidebar-link-active' : 'sidebar-link'} ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`
                          }
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          {!sidebarCollapsed && <span className="flex-1 lg:inline">{item.name}</span>}
                          {item.badge !== undefined && item.badge > 0 && !sidebarCollapsed && (
                            <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Courriers Service(s) */}
            {serviceCourrierNavigation.length > 0 && (
              <div className="pt-3">
                {!sidebarCollapsed ? (
                  <button
                    onClick={() => setServiceOpen(!serviceOpen)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                  >
                    {serviceOpen ? (
                      <ChevronDownIcon className="w-4 h-4" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4" />
                    )}
                    <span>Courriers Service(s)</span>
                  </button>
                ) : (
                  <div className="hidden lg:block border-t border-gray-200 my-2"></div>
                )}
                <AnimatePresence initial={false}>
                  {(serviceOpen || sidebarCollapsed) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {serviceCourrierNavigation.map((item) => (
                        <NavLink
                          key={item.name + '-service'}
                          to={item.href}
                          title={sidebarCollapsed ? item.name : undefined}
                          className={() =>
                            `${isLinkActive(item.href) ? 'sidebar-link-active' : 'sidebar-link'} ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`
                          }
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          {!sidebarCollapsed && <span className="flex-1 lg:inline">{item.name}</span>}
                          {item.badge !== undefined && item.badge > 0 && !sidebarCollapsed && (
                            <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Admin Navigation */}
            {filteredAdminNav.length > 0 && (
              <div className="pt-3">
                {!sidebarCollapsed ? (
                  <button
                    onClick={() => setAdminOpen(!adminOpen)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                  >
                    {adminOpen ? (
                      <ChevronDownIcon className="w-4 h-4" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4" />
                    )}
                    <span>Administration</span>
                  </button>
                ) : (
                  <div className="hidden lg:block border-t border-gray-200 my-2"></div>
                )}
                <AnimatePresence initial={false}>
                  {(adminOpen || sidebarCollapsed) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {filteredAdminNav.map((item) => (
                        <NavLink
                          key={item.name}
                          to={item.href}
                          title={sidebarCollapsed ? item.name : undefined}
                          className={({ isActive }) =>
                            `${isActive ? 'sidebar-link-active' : 'sidebar-link'} ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`
                          }
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          {!sidebarCollapsed && <span className="lg:inline">{item.name}</span>}
                        </NavLink>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </nav>

          {/* User section */}
          <div className={`border-t border-gray-100 ${sidebarCollapsed ? 'lg:p-2' : 'p-4'}`}>
            <NavLink
              to="/profil"
              title={sidebarCollapsed ? user?.fullName : undefined}
              className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors ${sidebarCollapsed ? 'lg:justify-center lg:p-1' : ''}`}
            >
              {user?.avatar ? (
                <img
                  src={`/uploads/${user.avatar}`}
                  alt={user.fullName}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 font-semibold">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
              )}
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0 lg:block">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.group?.name}</p>
                </div>
              )}
            </NavLink>
            <button
              onClick={logout}
              title={sidebarCollapsed ? 'Déconnexion' : undefined}
              className={`mt-2 w-full btn-ghost text-gray-600 gap-2 ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : 'justify-start'}`}
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="lg:inline">Déconnexion</span>}
            </button>
            
            {/* Bouton pour réduire/agrandir la sidebar */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex mt-3 w-full items-center justify-center gap-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={sidebarCollapsed ? 'Agrandir le menu' : 'Réduire le menu'}
            >
              {sidebarCollapsed ? (
                <ChevronDoubleRightIcon className="w-5 h-5" />
              ) : (
                <>
                  <ChevronDoubleLeftIcon className="w-5 h-5" />
                  <span className="text-xs">Réduire</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>

            <div className="flex-1 lg:pl-0 pl-2">
              <h2 className="text-lg font-semibold text-gray-800">
                {getPageTitle(location.pathname)}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <UserMenu />
            </div>
          </div>
        </header>

        {/* ChatBot Button - Flottant en bas à droite */}
        <ChatBotButton />

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>

        {/* Footer */}
        {footerVisible && (
          <footer className="px-4 py-6 text-center text-sm text-gray-500 border-t border-gray-100">
            {footerText}
          </footer>
        )}
      </div>
    </div>
  );
}

// Helper pour obtenir le titre de la page
function getPageTitle(pathname) {
  const titles = {
    '/': 'Tableau de bord',
    '/courriers/a-traiter': 'Courriers à traiter',
    '/courriers/traites': 'Courriers traités',
    '/courriers/archives': 'Courriers archivés',
    '/profil': 'Mon profil',
    '/admin/utilisateurs': 'Gestion des utilisateurs',
    '/admin/groupes': 'Gestion des groupes',
    '/admin/services': 'Gestion des services',
    '/admin/contacts': 'Gestion des contacts',
    '/courriers/depart/nouveau': 'Nouveau courrier départ',
    '/courriers/depart/brouillons': 'Brouillons',
    '/courriers/depart/envoyes': 'Courriers envoyés',
    '/courriers/depart/archives': 'Courriers départ archivés',
    '/admin/parametres': 'Paramètres',
  };

  // Gérer les routes dynamiques
  if (pathname.startsWith('/courriers/depart/') && !titles[pathname]) {
    return 'Détails du courrier départ';
  }
  if (pathname.startsWith('/courriers/') && !titles[pathname]) {
    return 'Détails du courrier';
  }
  
  return titles[pathname] || 'GED Courrier';  // Fallback statique pour getPageTitle
}
