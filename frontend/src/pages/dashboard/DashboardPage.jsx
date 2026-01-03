import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { statsAPI, mailsAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  InboxIcon,
  CheckCircleIcon,
  ArchiveBoxIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  BuildingOfficeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  UserCircleIcon,
  SparklesIcon,
  FireIcon,
  BoltIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [importOpen, setImportOpen] = useState(true);
  const [mesCourrierOpen, setMesCourrierOpen] = useState(true);
  const [delegatedCourrierOpen, setDelegatedCourrierOpen] = useState(true);
  const [serviceCourrierOpen, setServiceCourrierOpen] = useState(true);
  const [statsGlobalesOpen, setStatsGlobalesOpen] = useState(true);
  const [recentMailsOpen, setRecentMailsOpen] = useState(true);
  const [urgentMailsOpen, setUrgentMailsOpen] = useState(true);
  const [pendingFilesOpen, setPendingFilesOpen] = useState(true);
  const [monthStatsOpen, setMonthStatsOpen] = useState(true);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await statsAPI.getDashboard();
      return response.data.data;
    }
  });

  const { data: recentMails, isLoading: recentLoading } = useQuery({
    queryKey: ['recent-mails'],
    queryFn: async () => {
      const response = await mailsAPI.getAll({ limit: 5, status: 'pending' });
      return response.data.data.mails;
    }
  });

  const { data: urgentMails } = useQuery({
    queryKey: ['urgent-mails'],
    queryFn: async () => {
      const response = await mailsAPI.getAll({ limit: 5, priority: 'high', status: 'pending' });
      return response.data.data.mails;
    }
  });

  // Vérifier les permissions
  const userPermissions = user?.group?.permissions || [];
  const canImport = userPermissions.includes('import_mails');
  const canViewServiceMails = userPermissions.includes('view_service_mails');
  const isAdminOrSupervisor = canViewServiceMails || userPermissions.includes('view_users');
  const userHasServices = user?.services?.length > 0;
  const userId = user?._id?.toString?.() || user?._id || user?.id;
  const isServiceSupervisor = user?.services?.some(s => {
    const supervisorId = s.supervisor?._id?.toString?.() || s.supervisor?._id || s.supervisor?.toString?.() || s.supervisor;
    return supervisorId && userId && String(supervisorId) === String(userId);
  });
  const canAccessServiceMails = canViewServiceMails || isServiceSupervisor;

  // Récupérer les courriers en attente d'import
  const { data: pendingFiles, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-files'],
    queryFn: async () => {
      const response = await mailsAPI.getPending();
      return response.data.data;
    },
    enabled: canImport
  });

  if (statsLoading) return <LoadingSpinner />;

  // Classes de couleurs pour les cards
  const colorClasses = {
    warning: 'bg-warning-50 text-warning-600 border-warning-200',
    success: 'bg-success-50 text-success-600 border-success-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    primary: 'bg-primary-50 text-primary-600 border-primary-200',
    danger: 'bg-danger-50 text-danger-600 border-danger-200',
    info: 'bg-blue-50 text-blue-600 border-blue-200'
  };

  // Card Import - Courriers entrants
  const importCard = {
    title: 'Courriers entrants',
    value: pendingFiles?.length || 0,
    icon: ArrowDownTrayIcon,
    color: 'primary',
    link: '/courriers/entrants'
  };

  // Cards Mes Courriers (destinés à l'utilisateur)
  const myMailsCards = [
    {
      title: 'À traiter',
      value: stats?.my?.pending || 0,
      icon: InboxIcon,
      color: 'warning',
      link: '/courriers/a-traiter?scope=mine'
    },
    {
      title: 'Traités',
      value: stats?.my?.processed || 0,
      icon: CheckCircleIcon,
      color: 'success',
      link: '/courriers/traites?scope=mine'
    },
    {
      title: 'Archivés',
      value: stats?.my?.archived || 0,
      icon: ArchiveBoxIcon,
      color: 'gray',
      link: '/courriers/archives?scope=mine'
    }
  ];

  // Cards Courriers Service(s) - pour utilisateurs avec services
  const serviceMailsCards = [
    {
      title: 'À traiter',
      value: stats?.serviceMails?.pending || stats?.service?.pending || 0,
      icon: InboxIcon,
      color: 'warning',
      link: '/courriers/a-traiter?scope=service'
    },
    {
      title: 'Traités',
      value: stats?.serviceMails?.processed || stats?.service?.processed || 0,
      icon: CheckCircleIcon,
      color: 'success',
      link: '/courriers/traites?scope=service'
    },
    {
      title: 'Archivés',
      value: stats?.serviceMails?.archived || stats?.service?.archived || 0,
      icon: ArchiveBoxIcon,
      color: 'gray',
      link: '/courriers/archives?scope=service'
    }
  ];

  // Cards Courriers Délégués - pour utilisateurs avec délégations actives
  const hasDelegations = stats?.delegated && (stats.delegated.pending > 0 || stats.delegated.processed > 0 || stats.delegated.archived > 0);
  const delegatedMailsCards = [
    {
      title: 'À traiter',
      value: stats?.delegated?.pending || 0,
      icon: InboxIcon,
      color: 'warning',
      link: '/courriers/a-traiter?scope=delegated'
    },
    {
      title: 'Traités',
      value: stats?.delegated?.processed || 0,
      icon: CheckCircleIcon,
      color: 'success',
      link: '/courriers/traites?scope=delegated'
    },
    {
      title: 'Archivés',
      value: stats?.delegated?.archived || 0,
      icon: ArchiveBoxIcon,
      color: 'gray',
      link: '/courriers/archives?scope=delegated'
    }
  ];

  // Cards Tous les courriers (pour admin/superviseurs - vue globale)
  const allMailsCards = [
    {
      title: 'À traiter',
      value: stats?.serviceMails?.pending || stats?.totalPending || 0,
      icon: InboxIcon,
      color: 'warning',
      link: '/courriers/a-traiter?scope=service'
    },
    {
      title: 'Traités',
      value: stats?.serviceMails?.processed || stats?.totalProcessed || 0,
      icon: CheckCircleIcon,
      color: 'success',
      link: '/courriers/traites?scope=service'
    },
    {
      title: 'Archivés',
      value: stats?.serviceMails?.archived || stats?.totalArchived || 0,
      icon: ArchiveBoxIcon,
      color: 'gray',
      link: '/courriers/archives?scope=service'
    },
    {
      title: 'Temps moyen',
      value: stats?.avgProcessingTime ? `${stats.avgProcessingTime}j` : 'N/A',
      icon: ClockIcon,
      color: 'info',
      link: null
    }
  ];

  // Composant Card réutilisable - Design amélioré
  const StatCard = ({ card, index }) => {
    const gradients = {
      warning: 'from-amber-500 to-orange-500',
      success: 'from-emerald-500 to-green-500',
      gray: 'from-slate-500 to-gray-500',
      primary: 'from-indigo-500 to-purple-500',
      danger: 'from-red-500 to-rose-500',
      info: 'from-blue-500 to-cyan-500'
    };

    const bgColors = {
      warning: 'bg-amber-50 hover:bg-amber-100',
      success: 'bg-emerald-50 hover:bg-emerald-100',
      gray: 'bg-slate-50 hover:bg-slate-100',
      primary: 'bg-indigo-50 hover:bg-indigo-100',
      danger: 'bg-red-50 hover:bg-red-100',
      info: 'bg-blue-50 hover:bg-blue-100'
    };

    // Déterminer si l'animation doit être active
    // Animation active si valeur > 0 ET ce n'est PAS une carte "Archivés"
    const numericValue = typeof card.value === 'number' ? card.value : parseInt(card.value) || 0;
    const isArchived = card.title === 'Archivés';
    const shouldAnimate = numericValue > 0 && !isArchived;

    const Content = () => (
      <div className={`relative overflow-hidden rounded-2xl ${bgColors[card.color]} p-6 transition-all duration-300 group`}>
        {/* Gradient accent bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradients[card.color]}`} />
        
        {/* Background decoration */}
        <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-gradient-to-br ${gradients[card.color]} opacity-10 group-hover:opacity-20 transition-opacity`} />
        
        {/* Pulse effect background when animated */}
        {shouldAnimate && (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradients[card.color]} opacity-0 animate-pulse-subtle`} />
        )}
        
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
            <p className={`text-4xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 bg-clip-text text-transparent ${shouldAnimate ? 'animate-pulse-number' : ''}`}>
              {card.value}
            </p>
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradients[card.color]} shadow-lg ${shouldAnimate ? 'animate-bounce-subtle' : ''}`}>
            <card.icon className={`w-6 h-6 text-white ${shouldAnimate ? 'animate-wiggle' : ''}`} />
          </div>
        </div>
        
        {card.link ? (
          <div className="mt-4 flex items-center text-sm font-medium text-gray-500 group-hover:text-gray-700 transition-colors">
            <span>Voir détails</span>
            <ArrowRightIcon className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        ) : (
          <div className="mt-4 h-5" /> 
        )}
      </div>
    );

    return (
      <div>
        {card.link ? (
          <Link to={card.link}><Content /></Link>
        ) : (
          <Content />
        )}
      </div>
    );
  };

  // Titre de section amélioré
  const SectionTitle = ({ icon: Icon, title, subtitle, isOpen, onToggle, badge }) => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {onToggle ? (
          <button
            onClick={onToggle}
            className="flex items-center gap-3 hover:text-primary-600 transition-colors group"
          >
            <div className="p-2 rounded-xl bg-gray-100 group-hover:bg-primary-100 transition-colors">
              {isOpen ? (
                <ChevronDownIcon className="w-5 h-5 text-gray-500 group-hover:text-primary-600" />
              ) : (
                <ChevronRightIcon className="w-5 h-5 text-gray-500 group-hover:text-primary-600" />
              )}
            </div>
            <div className="p-2 rounded-xl bg-primary-100">
              <Icon className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">{title}</h2>
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
          </button>
        ) : (
          <>
            <div className="p-2 rounded-xl bg-primary-100">
              <Icon className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">{title}</h2>
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
          </>
        )}
        {badge && (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary-100 text-primary-700">
            {badge}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Welcome Header - Design amélioré */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-500 to-indigo-600 p-8 text-white"
      >
        {/* Background patterns */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/20 backdrop-blur">
              <SparklesIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">
                Bonjour, {user?.firstName} 👋
              </h1>
              <p className="text-primary-100 mt-1">
                Voici un aperçu de votre gestion de courrier
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 backdrop-blur">
              <CalendarDaysIcon className="w-5 h-5" />
              <span className="text-sm font-medium">
                {format(new Date(), "EEEE dd MMMM yyyy", { locale: fr })}
              </span>
            </div>
          </div>
        </div>

        {/* Quick stats bar */}
        <div className="relative mt-6 pt-6 border-t border-white/20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-white/20 ${(stats?.my?.pending || 0) > 0 ? 'animate-bounce-subtle' : ''}`}>
                <InboxIcon className={`w-5 h-5 ${(stats?.my?.pending || 0) > 0 ? 'animate-wiggle' : ''}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${(stats?.my?.pending || 0) > 0 ? 'animate-pulse-number' : ''}`}>{stats?.my?.pending || 0}</p>
                <p className="text-xs text-primary-100">À traiter</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-white/20 ${(stats?.my?.processed || 0) > 0 ? 'animate-bounce-subtle' : ''}`}>
                <CheckCircleIcon className={`w-5 h-5 ${(stats?.my?.processed || 0) > 0 ? 'animate-wiggle' : ''}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${(stats?.my?.processed || 0) > 0 ? 'animate-pulse-number' : ''}`}>{stats?.my?.processed || 0}</p>
                <p className="text-xs text-primary-100">Traités</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-white/20 ${(urgentMails?.length || 0) > 0 ? 'animate-bounce-subtle' : ''}`}>
                <FireIcon className={`w-5 h-5 ${(urgentMails?.length || 0) > 0 ? 'animate-wiggle' : ''}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${(urgentMails?.length || 0) > 0 ? 'animate-pulse-number' : ''}`}>{urgentMails?.length || 0}</p>
                <p className="text-xs text-primary-100">Urgents</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20">
                <BoltIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.avgProcessingTime || 'N/A'}{stats?.avgProcessingTime ? 'j' : ''}</p>
                <p className="text-xs text-primary-100">Temps moyen</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* GROUPE IMPORT - Visible seulement pour ceux qui peuvent importer */}
      {canImport && (
        <section>
          <SectionTitle 
            icon={ArrowDownTrayIcon} 
            title="Import" 
            isOpen={importOpen}
            onToggle={() => setImportOpen(!importOpen)}
          />
          <AnimatePresence initial={false}>
            {importOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 gap-6">
                  <StatCard card={importCard} index={0} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* GROUPE MES COURRIERS */}
      <section>
        <SectionTitle 
          icon={InboxIcon} 
          title="Mes courriers" 
          isOpen={mesCourrierOpen}
          onToggle={() => setMesCourrierOpen(!mesCourrierOpen)}
        />
        <AnimatePresence initial={false}>
          {mesCourrierOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {myMailsCards.map((card, index) => (
                  <StatCard key={card.title} card={card} index={index} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* GROUPE COURRIERS DÉLÉGUÉS - Pour utilisateurs avec délégations actives */}
      {hasDelegations && (
        <section>
          <SectionTitle 
            icon={UserCircleIcon} 
            title="Courriers Délégués" 
            isOpen={delegatedCourrierOpen}
            onToggle={() => setDelegatedCourrierOpen(!delegatedCourrierOpen)}
          />
          <AnimatePresence initial={false}>
            {delegatedCourrierOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {delegatedMailsCards.map((card, index) => (
                    <StatCard key={card.title + '-delegated'} card={card} index={index} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* GROUPE COURRIERS SERVICE(S) - Pour utilisateurs avec services ET (permission OU superviseur) */}
      {userHasServices && canAccessServiceMails && (
        <section>
          <SectionTitle 
            icon={BuildingOfficeIcon} 
            title="Courriers Service(s)" 
            isOpen={serviceCourrierOpen}
            onToggle={() => setServiceCourrierOpen(!serviceCourrierOpen)}
          />
          <AnimatePresence initial={false}>
            {serviceCourrierOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {serviceMailsCards.map((card, index) => (
                    <StatCard key={card.title + '-service'} card={card} index={index} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* GROUPE TOUS LES COURRIERS - Pour admin/superviseurs (stats globales) */}
      {isAdminOrSupervisor && (
        <section>
          <SectionTitle 
            icon={ArrowTrendingUpIcon} 
            title="Statistiques globales" 
            isOpen={statsGlobalesOpen}
            onToggle={() => setStatsGlobalesOpen(!statsGlobalesOpen)}
          />
          <AnimatePresence initial={false}>
            {statsGlobalesOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {allMailsCards.map((card, index) => (
                    <StatCard key={card.title + '-all'} card={card} index={index} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* Content Grid - Listes détaillées */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Pending Mails */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setRecentMailsOpen(!recentMailsOpen)}
            className={`w-full p-5 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-colors ${recentMailsOpen ? 'border-b border-gray-100' : ''}`}
          >
            <h2 className="font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-200">
                <InboxIcon className="w-5 h-5 text-white" />
              </div>
              Derniers courriers à traiter
            </h2>
            <div className="flex items-center gap-3">
              <Link 
                to="/courriers/a-traiter" 
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
              >
                Voir tout
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <div className="p-1 rounded-lg bg-amber-100">
                {recentMailsOpen ? (
                  <ChevronDownIcon className="w-5 h-5 text-amber-600" />
                ) : (
                  <ChevronRightIcon className="w-5 h-5 text-amber-600" />
                )}
              </div>
            </div>
          </button>
          <AnimatePresence initial={false}>
            {recentMailsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="divide-y divide-gray-50">
                  {recentLoading ? (
                    <div className="p-8 text-center">
                      <LoadingSpinner />
                    </div>
                  ) : recentMails?.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircleIcon className="w-8 h-8 text-green-500" />
                      </div>
                      <p className="text-gray-500 font-medium">Aucun courrier en attente</p>
                      <p className="text-sm text-gray-400 mt-1">Vous êtes à jour !</p>
                    </div>
                  ) : (
                    recentMails?.map((mail, index) => (
                      <Link
                        key={mail._id}
                        to={`/courriers/${mail._id}`}
                        className="block p-4 hover:bg-gray-50 transition-all duration-200 group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                              {mail.subject}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <UserCircleIcon className="w-4 h-4 text-gray-400" />
                              <p className="text-sm text-gray-500 truncate">
                                {mail.sender?.name || mail.senderName}
                              </p>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <span className="text-xs font-medium text-gray-400">
                              {format(new Date(mail.receivedDate), 'dd MMM', { locale: fr })}
                            </span>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDistanceToNow(new Date(mail.receivedDate), { addSuffix: true, locale: fr })}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Urgent Mails */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setUrgentMailsOpen(!urgentMailsOpen)}
            className={`w-full p-5 flex items-center justify-between bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 transition-colors ${urgentMailsOpen ? 'border-b border-gray-100' : ''}`}
          >
            <h2 className="font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 shadow-lg shadow-red-200">
                <ExclamationTriangleIcon className="w-5 h-5 text-white" />
              </div>
              Courriers urgents
              {urgentMails?.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700 animate-pulse">
                  {urgentMails.length}
                </span>
              )}
            </h2>
            <div className="p-1 rounded-lg bg-red-100">
              {urgentMailsOpen ? (
                <ChevronDownIcon className="w-5 h-5 text-red-600" />
              ) : (
                <ChevronRightIcon className="w-5 h-5 text-red-600" />
              )}
            </div>
          </button>
          <AnimatePresence initial={false}>
            {urgentMailsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="divide-y divide-gray-50">
                  {urgentMails?.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircleIcon className="w-8 h-8 text-green-500" />
                      </div>
                      <p className="text-gray-500 font-medium">Aucun courrier urgent</p>
                      <p className="text-sm text-gray-400 mt-1">Tout va bien !</p>
                    </div>
                  ) : (
                    urgentMails?.map((mail) => (
                      <Link
                        key={mail._id}
                        to={`/courriers/${mail._id}`}
                        className="block p-4 hover:bg-red-50 transition-all duration-200 group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg shadow-red-200">
                            <FireIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-100 text-red-700">
                                URGENT
                              </span>
                            </div>
                            <p className="font-semibold text-gray-900 truncate group-hover:text-red-600 transition-colors">
                              {mail.subject}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <UserCircleIcon className="w-4 h-4 text-gray-400" />
                              <p className="text-sm text-gray-500 truncate">
                                {mail.sender?.name || mail.senderName}
                              </p>
                            </div>
                          </div>
                          <span className="flex-shrink-0 text-xs font-medium text-gray-400">
                            {format(new Date(mail.receivedDate), 'dd MMM', { locale: fr })}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Courriers Entrants - Liste détaillée pour Admin et Archivistes */}
        {canImport && pendingFiles?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setPendingFilesOpen(!pendingFilesOpen)}
              className={`w-full p-5 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-colors ${pendingFilesOpen ? 'border-b border-gray-100' : ''}`}
            >
              <h2 className="font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-200">
                  <ArrowDownTrayIcon className="w-5 h-5 text-white" />
                </div>
                Fichiers en attente d'import
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-100 text-indigo-700">
                  {pendingFiles.length}
                </span>
              </h2>
              <div className="flex items-center gap-3">
                <Link 
                  to="/courriers/entrants" 
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Gérer
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
                <div className="p-1 rounded-lg bg-indigo-100">
                  {pendingFilesOpen ? (
                    <ChevronDownIcon className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <ChevronRightIcon className="w-5 h-5 text-indigo-600" />
                  )}
                </div>
              </div>
            </button>
            <AnimatePresence initial={false}>
              {pendingFilesOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                    {pendingLoading ? (
                      <div className="p-8 text-center">
                        <LoadingSpinner />
                      </div>
                    ) : (
                      pendingFiles?.slice(0, 5).map((file, index) => (
                        <Link
                          key={file._id}
                          to={`/courriers/entrants?file=${file._id}`}
                          className="block p-4 hover:bg-indigo-50 transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
                              <DocumentTextIcon className="w-6 h-6 text-red-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                                {file.originalName || file.fileName}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {file.createdAt && format(new Date(file.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                              </p>
                            </div>
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-100 text-amber-700">
                              En attente
                            </span>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                  {pendingFiles?.length > 5 && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
                      <Link 
                        to="/courriers/entrants" 
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        Voir les {pendingFiles.length - 5} autres fichiers →
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Statistics Chart - Pour admin/superviseurs */}
        {isAdminOrSupervisor && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setMonthStatsOpen(!monthStatsOpen)}
              className={`w-full p-5 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 transition-colors ${monthStatsOpen ? 'border-b border-gray-100' : ''}`}
            >
              <h2 className="font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-200">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-white" />
                </div>
                Statistiques du mois
              </h2>
              <div className="p-1 rounded-lg bg-emerald-100">
                {monthStatsOpen ? (
                  <ChevronDownIcon className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ChevronRightIcon className="w-5 h-5 text-emerald-600" />
                )}
              </div>
            </button>
            <AnimatePresence initial={false}>
              {monthStatsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-200">
                          <InboxIcon className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                          {stats?.thisMonthCount || 0}
                        </p>
                        <p className="text-sm font-medium text-gray-500 mt-1">Reçus</p>
                      </div>
                      <div className="text-center p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                          <CheckCircleIcon className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                          {stats?.processedThisMonth || 0}
                        </p>
                        <p className="text-sm font-medium text-gray-500 mt-1">Traités</p>
                      </div>
                      <div className="text-center p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
                          <ClockIcon className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                          {stats?.pendingOverdue || 0}
                        </p>
                        <p className="text-sm font-medium text-gray-500 mt-1">En retard</p>
                      </div>
                    </div>

                    {/* Per Service Stats */}
                    {stats?.perService && stats.perService.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-100">
                        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                          <BuildingOfficeIcon className="w-4 h-4" />
                          Par service
                        </h3>
                        <div className="space-y-3">
                          {stats.perService.slice(0, 5).map((service, index) => {
                            const maxCount = Math.max(...stats.perService.map(s => s.count));
                            const percentage = maxCount > 0 ? (service.count / maxCount) * 100 : 0;
                            return (
                              <div key={service._id} className="group">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: service.color || '#6B7280' }}
                                    />
                                    <span className="text-sm font-medium text-gray-700 truncate">{service.name}</span>
                                  </div>
                                  <span className="text-sm font-bold text-gray-900">{service.count}</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ 
                                      width: `${percentage}%`,
                                      backgroundColor: service.color || '#6B7280'
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
