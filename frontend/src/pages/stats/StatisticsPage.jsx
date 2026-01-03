import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Pie, Doughnut, Line } from 'react-chartjs-2';
import { statsAPI, servicesAPI, usersAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatsExportOptionsModal from '../../components/modals/StatsExportOptionsModal';
import {
  ChartBarIcon,
  ClockIcon,
  DocumentTextIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ArchiveBoxIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  SparklesIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cog6ToothIcon,
  InboxArrowDownIcon
} from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';

// Enregistrer les composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

const PRIORITY_LABELS = {
  low: 'Basse',
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgente'
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function StatisticsPage() {
  const { user } = useAuthStore();
  const chartsRef = useRef(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    summaryCards: true,
    timeCards: true,
    statusChart: true,
    priorityChart: true,
    monthlyChart: true,
    importChart: true,
    myPerformance: true,
    userStats: true,
    serviceStats: true,
    senderStats: true
  });
  
  const canViewAll = user?.group?.permissions?.includes('view_all_mails');
  const userId = user?._id?.toString?.() || user?._id || user?.id;
  const isServiceSupervisor = user?.services?.some(s => {
    const supervisorId = s.supervisor?._id?.toString?.() || s.supervisor?._id || s.supervisor?.toString?.() || s.supervisor;
    return supervisorId && userId && String(supervisorId) === String(userId);
  });
  const canViewService = (user?.group?.permissions?.includes('view_service_mails') || isServiceSupervisor) && user?.services?.length > 0;
  const isServiceResponsible = isServiceSupervisor;

  // Filtres
  const [filters, setFilters] = useState({
    scope: 'my',
    startDate: '',
    endDate: '',
    serviceId: '',
    userId: ''
  });

  // Charger les services et utilisateurs pour les filtres
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await servicesAPI.getAll();
      return res.data.data;
    },
    enabled: canViewAll || canViewService
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await usersAPI.getAll({ limit: 500 });
      return res.data.data.users;
    },
    enabled: canViewAll
  });

  // Charger les statistiques détaillées
  const { data: stats, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['detailed-stats', filters],
    queryFn: async () => {
      const res = await statsAPI.getDetailed(filters);
      return res.data.data;
    }
  });

  // Charger mes performances
  const { data: myPerformance } = useQuery({
    queryKey: ['my-performance', filters.startDate, filters.endDate],
    queryFn: async () => {
      const res = await statsAPI.getMyPerformance({
        startDate: filters.startDate,
        endDate: filters.endDate
      });
      return res.data.data;
    }
  });

  // Export PDF avec options - génération directe
  const exportToPDF = async (options = exportOptions) => {
    if (!chartsRef.current) return;
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      let currentY = 0;

      // Fonction pour ajouter une nouvelle page si nécessaire
      const checkNewPage = (neededHeight) => {
        if (currentY + neededHeight > pdfHeight - 15) {
          pdf.addPage();
          currentY = 15;
          return true;
        }
        return false;
      };

      // Fonction pour capturer un graphique en haute qualité
      const captureChartHQ = (canvas, targetWidth, targetHeight) => {
        if (!canvas) return null;
        
        try {
          // Créer un canvas temporaire plus grand pour meilleure qualité
          const scale = 3; // Facteur d'échelle pour haute résolution
          const tempCanvas = document.createElement('canvas');
          const ctx = tempCanvas.getContext('2d');
          
          tempCanvas.width = canvas.width * scale;
          tempCanvas.height = canvas.height * scale;
          
          ctx.scale(scale, scale);
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(canvas, 0, 0);
          
          return tempCanvas.toDataURL('image/png', 1.0);
        } catch (e) {
          // Fallback: utiliser le canvas directement
          return canvas.toDataURL('image/png', 1.0);
        }
      };

      // ==================== HEADER ====================
      // Fond header avec dégradé simulé
      const headerHeight = 32;
      for (let i = 0; i < headerHeight; i++) {
        const ratio = i / headerHeight;
        const r = Math.round(79 + (124 - 79) * ratio);
        const g = Math.round(70 + (58 - 70) * ratio);
        const b = Math.round(229 + (237 - 229) * ratio);
        pdf.setFillColor(r, g, b);
        pdf.rect(0, i, pdfWidth, 1, 'F');
      }
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont(undefined, 'bold');
      pdf.text('Rapport Statistiques', margin, 18);
      
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');
      const dateStr = new Date().toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      pdf.text(`Généré le ${dateStr}`, pdfWidth - margin, 14, { align: 'right' });
      pdf.text(`Par: ${user?.firstName} ${user?.lastName}`, pdfWidth - margin, 21, { align: 'right' });
      
      // Sous-header filtres
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, headerHeight, pdfWidth, 12, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.line(0, headerHeight + 12, pdfWidth, headerHeight + 12);
      
      const scopeLabel = filters.scope === 'all' ? 'Tous les courriers' : 
                         filters.scope === 'service' ? 'Courriers du service' : 
                         filters.scope === 'delegated' ? 'Courriers délégués' : 'Mes courriers';
      
      pdf.setTextColor(79, 70, 229);
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'bold');
      pdf.text('Filtres:', margin, headerHeight + 8);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(71, 85, 105);
      pdf.text(scopeLabel, margin + 16, headerHeight + 8);
      
      if (filters.startDate || filters.endDate) {
        const dateRange = filters.startDate && filters.endDate 
          ? `Du ${new Date(filters.startDate).toLocaleDateString('fr-FR')} au ${new Date(filters.endDate).toLocaleDateString('fr-FR')}`
          : filters.startDate 
            ? `Depuis le ${new Date(filters.startDate).toLocaleDateString('fr-FR')}`
            : `Jusqu'au ${new Date(filters.endDate).toLocaleDateString('fr-FR')}`;
        pdf.text(`  •  ${dateRange}`, margin + 50, headerHeight + 8);
      }
      
      currentY = headerHeight + 18;

      // ==================== CARTES RÉSUMÉ ====================
      if (options.summaryCards && stats?.summary) {
        const cardWidth = (pdfWidth - margin * 2 - 12) / 4;
        const cardHeight = 26;
        
        const summaryCards = [
          { label: 'Total courriers', value: stats.summary.total, color: [59, 130, 246], bg: [239, 246, 255] },
          { label: 'À traiter', value: stats.summary.pending, color: [245, 158, 11], bg: [255, 251, 235] },
          { label: 'Traités', value: stats.summary.processed, color: [34, 197, 94], bg: [240, 253, 244] },
          { label: 'Archivés', value: stats.summary.archived, color: [139, 92, 246], bg: [245, 243, 255] }
        ];
        
        summaryCards.forEach((card, i) => {
          const x = margin + i * (cardWidth + 4);
          
          // Fond de carte avec couleur de fond
          pdf.setFillColor(...card.bg);
          pdf.setDrawColor(...card.color);
          pdf.setLineWidth(0.8);
          pdf.roundedRect(x, currentY, cardWidth, cardHeight, 3, 3, 'FD');
          
          // Barre colorée en haut
          pdf.setFillColor(...card.color);
          pdf.roundedRect(x, currentY, cardWidth, 4, 3, 0, 'F');
          pdf.rect(x, currentY + 2, cardWidth, 2, 'F');
          
          // Valeur
          pdf.setTextColor(...card.color);
          pdf.setFontSize(18);
          pdf.setFont(undefined, 'bold');
          pdf.text(String(card.value), x + cardWidth / 2, currentY + 14, { align: 'center' });
          
          // Label
          pdf.setTextColor(100, 116, 139);
          pdf.setFontSize(7);
          pdf.setFont(undefined, 'normal');
          pdf.text(card.label, x + cardWidth / 2, currentY + 21, { align: 'center' });
        });
        
        currentY += cardHeight + 8;
      }

      // ==================== TEMPS DE TRAITEMENT ====================
      if (options.timeCards && stats?.processing) {
        const cardWidth = (pdfWidth - margin * 2 - 8) / 3;
        const cardHeight = 20;
        
        const timeCards = [
          { label: 'Temps moyen', value: `${stats.processing.avgTime || 0}h`, color: [59, 130, 246], bg: [239, 246, 255] },
          { label: 'Temps minimum', value: `${stats.processing.minTime || 0}h`, color: [34, 197, 94], bg: [240, 253, 244] },
          { label: 'Temps maximum', value: `${stats.processing.maxTime || 0}h`, color: [239, 68, 68], bg: [254, 242, 242] }
        ];
        
        timeCards.forEach((card, i) => {
          const x = margin + i * (cardWidth + 4);
          
          pdf.setFillColor(...card.bg);
          pdf.setDrawColor(...card.color);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'FD');
          
          pdf.setTextColor(...card.color);
          pdf.setFontSize(16);
          pdf.setFont(undefined, 'bold');
          pdf.text(card.value, x + cardWidth / 2, currentY + 10, { align: 'center' });
          
          pdf.setTextColor(100, 116, 139);
          pdf.setFontSize(7);
          pdf.setFont(undefined, 'normal');
          pdf.text(card.label, x + cardWidth / 2, currentY + 16, { align: 'center' });
        });
        
        currentY += cardHeight + 10;
      }

      // ==================== GRAPHIQUES DE RÉPARTITION ====================
      if (options.statusChart || options.priorityChart) {
        checkNewPage(75);
        
        // Titre section
        pdf.setTextColor(31, 41, 55);
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text('Répartition', margin, currentY);
        currentY += 6;
        
        const chartWidth = (pdfWidth - margin * 2 - 6) / 2;
        const chartHeight = 60;
        
        if (options.statusChart) {
          const statusCanvas = chartsRef.current.querySelector('[data-export-section="statusChart"] canvas');
          if (statusCanvas) {
            try {
              // Fond blanc avec bordure et ombre
              pdf.setFillColor(255, 255, 255);
              pdf.setDrawColor(229, 231, 235);
              pdf.setLineWidth(0.5);
              pdf.roundedRect(margin, currentY, chartWidth, chartHeight, 3, 3, 'FD');
              
              // Titre avec fond coloré
              pdf.setFillColor(239, 246, 255);
              pdf.roundedRect(margin, currentY, chartWidth, 10, 3, 0, 'F');
              pdf.rect(margin, currentY + 7, chartWidth, 3, 'F');
              
              pdf.setTextColor(59, 130, 246);
              pdf.setFontSize(9);
              pdf.setFont(undefined, 'bold');
              pdf.text('Par statut', margin + 5, currentY + 7);
              
              const imgData = captureChartHQ(statusCanvas);
              if (imgData) {
                // Calculer les proportions pour garder le ratio
                const canvasRatio = statusCanvas.width / statusCanvas.height;
                const availableWidth = chartWidth - 10;
                const availableHeight = chartHeight - 15;
                let imgWidth, imgHeight;
                
                if (canvasRatio > availableWidth / availableHeight) {
                  imgWidth = availableWidth;
                  imgHeight = availableWidth / canvasRatio;
                } else {
                  imgHeight = availableHeight;
                  imgWidth = availableHeight * canvasRatio;
                }
                
                const imgX = margin + 5 + (availableWidth - imgWidth) / 2;
                const imgY = currentY + 12 + (availableHeight - imgHeight) / 2;
                
                pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth, imgHeight);
              }
            } catch (e) {
              console.warn('Erreur export statut:', e);
            }
          }
        }
        
        if (options.priorityChart) {
          const priorityCanvas = chartsRef.current.querySelector('[data-export-section="priorityChart"] canvas');
          if (priorityCanvas) {
            try {
              const x = margin + chartWidth + 6;
              
              pdf.setFillColor(255, 255, 255);
              pdf.setDrawColor(229, 231, 235);
              pdf.setLineWidth(0.5);
              pdf.roundedRect(x, currentY, chartWidth, chartHeight, 3, 3, 'FD');
              
              // Titre avec fond coloré
              pdf.setFillColor(254, 243, 199);
              pdf.roundedRect(x, currentY, chartWidth, 10, 3, 0, 'F');
              pdf.rect(x, currentY + 7, chartWidth, 3, 'F');
              
              pdf.setTextColor(217, 119, 6);
              pdf.setFontSize(9);
              pdf.setFont(undefined, 'bold');
              pdf.text('Par priorité', x + 5, currentY + 7);
              
              const imgData = captureChartHQ(priorityCanvas);
              if (imgData) {
                const canvasRatio = priorityCanvas.width / priorityCanvas.height;
                const availableWidth = chartWidth - 10;
                const availableHeight = chartHeight - 15;
                let imgWidth, imgHeight;
                
                if (canvasRatio > availableWidth / availableHeight) {
                  imgWidth = availableWidth;
                  imgHeight = availableWidth / canvasRatio;
                } else {
                  imgHeight = availableHeight;
                  imgWidth = availableHeight * canvasRatio;
                }
                
                const imgX = x + 5 + (availableWidth - imgWidth) / 2;
                const imgY = currentY + 12 + (availableHeight - imgHeight) / 2;
                
                pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth, imgHeight);
              }
            } catch (e) {
              console.warn('Erreur export priorité:', e);
            }
          }
        }
        
        currentY += chartHeight + 8;
      }

      // ==================== ÉVOLUTION MENSUELLE ====================
      if (options.monthlyChart) {
        checkNewPage(65);
        
        const monthlyCanvas = chartsRef.current.querySelector('[data-export-section="monthlyChart"] canvas');
        if (monthlyCanvas) {
          try {
            const boxHeight = 55;
            
            pdf.setFillColor(255, 255, 255);
            pdf.setDrawColor(229, 231, 235);
            pdf.setLineWidth(0.5);
            pdf.roundedRect(margin, currentY, pdfWidth - margin * 2, boxHeight, 3, 3, 'FD');
            
            // Titre avec fond
            pdf.setFillColor(240, 253, 244);
            pdf.roundedRect(margin, currentY, pdfWidth - margin * 2, 10, 3, 0, 'F');
            pdf.rect(margin, currentY + 7, pdfWidth - margin * 2, 3, 'F');
            
            pdf.setTextColor(22, 163, 74);
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'bold');
            pdf.text('Évolution mensuelle', margin + 5, currentY + 7);
            
            const imgData = captureChartHQ(monthlyCanvas);
            if (imgData) {
              pdf.addImage(imgData, 'PNG', margin + 5, currentY + 12, pdfWidth - margin * 2 - 10, boxHeight - 16);
            }
            
            currentY += boxHeight + 8;
          } catch (e) {
            console.warn('Erreur export mensuel:', e);
          }
        }
      }

      // ==================== STATISTIQUES D'IMPORT ====================
      if (options.importChart && stats?.importStats?.length > 0) {
        checkNewPage(70);
        
        // Titre section
        pdf.setTextColor(31, 41, 55);
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text('Courriers importés', margin, currentY);
        currentY += 6;
        
        // Cartes récap import
        const importCardWidth = (pdfWidth - margin * 2 - 8) / 3;
        const importCardHeight = 18;
        
        const importCards = [
          { label: 'Import manuel', value: stats.importSummary?.manual || 0, color: [59, 130, 246], bg: [239, 246, 255] },
          { label: 'Import IMAP', value: stats.importSummary?.imap || 0, color: [16, 185, 129], bg: [236, 253, 245] },
          { label: 'Total', value: (stats.importSummary?.manual || 0) + (stats.importSummary?.imap || 0), color: [139, 92, 246], bg: [245, 243, 255] }
        ];
        
        importCards.forEach((card, i) => {
          const x = margin + i * (importCardWidth + 4);
          
          pdf.setFillColor(...card.bg);
          pdf.setDrawColor(...card.color);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(x, currentY, importCardWidth, importCardHeight, 2, 2, 'FD');
          
          pdf.setTextColor(...card.color);
          pdf.setFontSize(14);
          pdf.setFont(undefined, 'bold');
          pdf.text(String(card.value), x + importCardWidth / 2, currentY + 9, { align: 'center' });
          
          pdf.setTextColor(100, 116, 139);
          pdf.setFontSize(6);
          pdf.setFont(undefined, 'normal');
          pdf.text(card.label, x + importCardWidth / 2, currentY + 14, { align: 'center' });
        });
        
        currentY += importCardHeight + 6;
        
        // Graphique import
        const importCanvas = chartsRef.current.querySelector('[data-export-section="importChart"] canvas');
        if (importCanvas) {
          try {
            const boxHeight = 45;
            
            pdf.setFillColor(255, 255, 255);
            pdf.setDrawColor(229, 231, 235);
            pdf.setLineWidth(0.5);
            pdf.roundedRect(margin, currentY, pdfWidth - margin * 2, boxHeight, 3, 3, 'FD');
            
            const imgData = captureChartHQ(importCanvas);
            if (imgData) {
              pdf.addImage(imgData, 'PNG', margin + 5, currentY + 4, pdfWidth - margin * 2 - 10, boxHeight - 8);
            }
            
            currentY += boxHeight + 8;
          } catch (e) {
            console.warn('Erreur export import:', e);
          }
        }
      }

      // ==================== MES PERFORMANCES ====================
      if (options.myPerformance && myPerformance) {
        checkNewPage(60);
        
        const perfBoxHeight = 52;
        
        // Fond gradient simulé (vert vers teal)
        for (let i = 0; i < perfBoxHeight; i++) {
          const ratio = i / perfBoxHeight;
          const r = Math.round(16 + (13 - 16) * ratio);
          const g = Math.round(185 + (148 - 185) * ratio);
          const b = Math.round(129 + (136 - 129) * ratio);
          pdf.setFillColor(r, g, b);
          pdf.rect(margin, currentY + i, pdfWidth - margin * 2, 1, 'F');
        }
        
        // Titre
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'bold');
        pdf.text('Mes performances', margin + 6, currentY + 10);
        
        // Stats
        const perfCardWidth = (pdfWidth - margin * 2 - 24) / 3;
        const perfCards = [
          { label: 'Courriers traités', value: myPerformance.performance?.processedByMe || 0 },
          { label: 'Temps moyen', value: `${myPerformance.performance?.avgProcessingTime || 0}h` },
          { label: 'En attente', value: myPerformance.summary?.pending || 0 }
        ];
        
        perfCards.forEach((card, i) => {
          const x = margin + 6 + i * (perfCardWidth + 6);
          
          // Carte avec fond semi-transparent (simulé avec couleur claire)
          pdf.setFillColor(255, 255, 255);
          pdf.roundedRect(x, currentY + 14, perfCardWidth, 16, 2, 2, 'F');
          
          pdf.setTextColor(16, 185, 129);
          pdf.setFontSize(16);
          pdf.setFont(undefined, 'bold');
          pdf.text(String(card.value), x + perfCardWidth / 2, currentY + 24, { align: 'center' });
          
          pdf.setTextColor(71, 85, 105);
          pdf.setFontSize(7);
          pdf.setFont(undefined, 'normal');
          pdf.text(card.label, x + perfCardWidth / 2, currentY + 29, { align: 'center' });
        });
        
        // Graphique performance
        const perfCanvas = chartsRef.current.querySelector('[data-export-section="myPerformance"] canvas');
        if (perfCanvas) {
          try {
            pdf.setFillColor(255, 255, 255);
            pdf.roundedRect(margin + 6, currentY + 33, pdfWidth - margin * 2 - 12, 16, 2, 2, 'F');
            
            const imgData = captureChartHQ(perfCanvas);
            if (imgData) {
              pdf.addImage(imgData, 'PNG', margin + 8, currentY + 34, pdfWidth - margin * 2 - 16, 14);
            }
          } catch (e) {
            console.warn('Erreur export perf:', e);
          }
        }
        
        currentY += perfBoxHeight + 8;
      }

      // ==================== PERFORMANCE PAR UTILISATEUR ====================
      if (options.userStats && stats?.userStats?.length > 0 && filters.scope !== 'my') {
        checkNewPage(50);
        
        pdf.setTextColor(31, 41, 55);
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text('Performance par utilisateur', margin, currentY);
        currentY += 7;
        
        // En-têtes tableau avec fond arrondi
        pdf.setFillColor(79, 70, 229);
        pdf.roundedRect(margin, currentY, pdfWidth - margin * 2, 14, 2, 0, 'F');
        pdf.rect(margin, currentY + 7, pdfWidth - margin * 2, 7, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('Utilisateur', margin + 5, currentY + 10);
        pdf.text('Traités', pdfWidth - margin - 55, currentY + 10);
        pdf.text('Temps moy.', pdfWidth - margin - 28, currentY + 10);
        
        currentY += 14;
        
        // Lignes avec alternance de couleur
        pdf.setFont(undefined, 'normal');
        stats.userStats.slice(0, 8).forEach((userStat, i) => {
          if (i % 2 === 0) {
            pdf.setFillColor(255, 255, 255);
          } else {
            pdf.setFillColor(245, 243, 255);
          }
          pdf.rect(margin, currentY, pdfWidth - margin * 2, 12, 'F');
          
          pdf.setTextColor(31, 41, 55);
          pdf.setFontSize(12);
          pdf.text(`${userStat.firstName} ${userStat.lastName}`, margin + 5, currentY + 8.5);
          
          pdf.setTextColor(79, 70, 229);
          pdf.setFont(undefined, 'bold');
          pdf.text(String(userStat.processed), pdfWidth - margin - 55, currentY + 8.5);
          
          pdf.setTextColor(100, 116, 139);
          pdf.setFont(undefined, 'normal');
          pdf.text(userStat.avgTime ? `${userStat.avgTime}h` : '-', pdfWidth - margin - 28, currentY + 8.5);
          
          currentY += 12;
        });
        
        // Bordure de fermeture
        pdf.setDrawColor(229, 231, 235);
        pdf.line(margin, currentY, pdfWidth - margin, currentY);
        
        currentY += 10;
      }

      // ==================== RÉPARTITION PAR SERVICE ====================
      if (options.serviceStats && stats?.serviceStats?.length > 0 && filters.scope === 'all') {
        checkNewPage(60);
        
        pdf.setTextColor(31, 41, 55);
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text('Répartition par service', margin, currentY);
        currentY += 7;
        
        // En-têtes tableau
        pdf.setFillColor(16, 185, 129);
        pdf.roundedRect(margin, currentY, pdfWidth - margin * 2, 14, 2, 0, 'F');
        pdf.rect(margin, currentY + 7, pdfWidth - margin * 2, 7, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text('Service', margin + 5, currentY + 10);
        pdf.text('Total', pdfWidth - margin - 95, currentY + 10);
        pdf.text('À traiter', pdfWidth - margin - 72, currentY + 10);
        pdf.text('Traités', pdfWidth - margin - 48, currentY + 10);
        pdf.text('Archivés', pdfWidth - margin - 22, currentY + 10);
        
        currentY += 14;
        
        pdf.setFont(undefined, 'normal');
        stats.serviceStats.slice(0, 8).forEach((service, i) => {
          if (i % 2 === 0) {
            pdf.setFillColor(255, 255, 255);
          } else {
            pdf.setFillColor(240, 253, 244);
          }
          pdf.rect(margin, currentY, pdfWidth - margin * 2, 12, 'F');
          
          pdf.setTextColor(31, 41, 55);
          pdf.setFontSize(11);
          pdf.text(service.name?.substring(0, 22) || '-', margin + 5, currentY + 8.5);
          
          pdf.setTextColor(31, 41, 55);
          pdf.setFont(undefined, 'bold');
          pdf.text(String(service.total), pdfWidth - margin - 95, currentY + 8.5);
          
          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(245, 158, 11);
          pdf.text(String(service.pending), pdfWidth - margin - 72, currentY + 8.5);
          
          pdf.setTextColor(34, 197, 94);
          pdf.text(String(service.processed), pdfWidth - margin - 48, currentY + 8.5);
          
          pdf.setTextColor(139, 92, 246);
          pdf.text(String(service.archived), pdfWidth - margin - 22, currentY + 8.5);
          
          currentY += 12;
        });
        
        pdf.setDrawColor(229, 231, 235);
        pdf.line(margin, currentY, pdfWidth - margin, currentY);
        
        currentY += 8;
      }

      // ==================== TOP EXPÉDITEURS ====================
      if (options.senderStats && stats?.senderStats?.length > 0) {
        checkNewPage(55);
        
        pdf.setTextColor(31, 41, 55);
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'bold');
        pdf.text('Top 10 expéditeurs', margin, currentY);
        currentY += 6;
        
        const senderCanvas = chartsRef.current.querySelector('[data-export-section="senderStats"] canvas');
        if (senderCanvas) {
          try {
            const boxHeight = 45;
            
            pdf.setFillColor(255, 255, 255);
            pdf.setDrawColor(229, 231, 235);
            pdf.setLineWidth(0.5);
            pdf.roundedRect(margin, currentY, pdfWidth - margin * 2, boxHeight, 3, 3, 'FD');
            
            const imgData = captureChartHQ(senderCanvas);
            if (imgData) {
              pdf.addImage(imgData, 'PNG', margin + 5, currentY + 4, pdfWidth - margin * 2 - 10, boxHeight - 8);
            }
            
            currentY += boxHeight + 8;
          } catch (e) {
            console.warn('Erreur export expéditeurs:', e);
          }
        }
      }

      // ==================== FOOTER ====================
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        
        // Fond footer avec dégradé léger
        pdf.setFillColor(248, 250, 252);
        pdf.rect(0, pdfHeight - 12, pdfWidth, 12, 'F');
        pdf.setDrawColor(226, 232, 240);
        pdf.line(0, pdfHeight - 12, pdfWidth, pdfHeight - 12);
        
        // Ligne colorée
        pdf.setDrawColor(79, 70, 229);
        pdf.setLineWidth(0.5);
        pdf.line(margin, pdfHeight - 12, pdfWidth - margin, pdfHeight - 12);
        
        pdf.setTextColor(100, 116, 139);
        pdf.setFontSize(7);
        pdf.text('GED Courrier - Rapport généré automatiquement', pdfWidth / 2, pdfHeight - 5, { align: 'center' });
        
        pdf.setTextColor(79, 70, 229);
        pdf.setFont(undefined, 'bold');
        pdf.text(`Page ${i}/${totalPages}`, pdfWidth - margin, pdfHeight - 5, { align: 'right' });
      }

      pdf.save(`statistiques_${filters.scope}_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Erreur export PDF:', error);
    }
  };

  // Données pour les graphiques avec style amélioré
  const statusChartData = {
    labels: ['À traiter', 'Traités', 'Archivés'],
    datasets: [{
      data: stats ? [stats.summary.pending, stats.summary.processed, stats.summary.archived] : [0, 0, 0],
      backgroundColor: [
        'rgba(251, 191, 36, 0.9)',
        'rgba(34, 197, 94, 0.9)',
        'rgba(139, 92, 246, 0.9)'
      ],
      borderColor: [
        'rgb(251, 191, 36)',
        'rgb(34, 197, 94)',
        'rgb(139, 92, 246)'
      ],
      borderWidth: 2,
      hoverOffset: 10
    }]
  };

  const monthlyChartData = {
    labels: stats?.monthlyStats?.map(m => MONTHS[m._id.month - 1]) || MONTHS,
    datasets: [
      {
        label: 'À traiter',
        data: stats?.monthlyStats?.map(m => m.pending) || [],
        backgroundColor: 'rgba(251, 191, 36, 0.8)',
        borderColor: 'rgb(251, 191, 36)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      },
      {
        label: 'Traités',
        data: stats?.monthlyStats?.map(m => m.processed) || [],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      },
      {
        label: 'Archivés',
        data: stats?.monthlyStats?.map(m => m.archived) || [],
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderColor: 'rgb(139, 92, 246)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      }
    ]
  };

  const userChartData = {
    labels: stats?.userStats?.map(u => `${u.firstName} ${u.lastName?.charAt(0)}.`) || [],
    datasets: [{
      label: 'Courriers traités',
      data: stats?.userStats?.map(u => u.processed) || [],
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 2,
      borderRadius: 8
    }]
  };

  const serviceChartData = {
    labels: stats?.serviceStats?.map(s => s.name) || [],
    datasets: [{
      label: 'Courriers',
      data: stats?.serviceStats?.map(s => s.total) || [],
      backgroundColor: stats?.serviceStats?.map((s, i) => {
        const colors = ['rgba(59, 130, 246, 0.8)', 'rgba(139, 92, 246, 0.8)', 'rgba(236, 72, 153, 0.8)', 'rgba(34, 197, 94, 0.8)', 'rgba(251, 191, 36, 0.8)'];
        return s.color || colors[i % colors.length];
      }) || [],
      borderWidth: 2,
      borderRadius: 8
    }]
  };

  const priorityChartData = {
    labels: stats?.priorityStats?.map(p => PRIORITY_LABELS[p._id] || p._id) || [],
    datasets: [{
      data: stats?.priorityStats?.map(p => p.count) || [],
      backgroundColor: stats?.priorityStats?.map(p => {
        const colors = {
          low: 'rgba(34, 197, 94, 0.9)',
          normal: 'rgba(59, 130, 246, 0.9)',
          high: 'rgba(251, 191, 36, 0.9)',
          urgent: 'rgba(239, 68, 68, 0.9)'
        };
        return colors[p._id] || 'rgba(107, 114, 128, 0.9)';
      }) || [],
      borderWidth: 0,
      hoverOffset: 8
    }]
  };

  const senderChartData = {
    labels: stats?.senderStats?.map(s => s.name?.length > 25 ? s.name?.substring(0, 25) + '...' : s.name) || [],
    datasets: [{
      label: 'Courriers reçus',
      data: stats?.senderStats?.map(s => s.count) || [],
      backgroundColor: 'rgba(139, 92, 246, 0.8)',
      borderColor: 'rgb(139, 92, 246)',
      borderWidth: 2,
      borderRadius: 8
    }]
  };

  // Graphique des imports (Manuel vs IMAP)
  const importChartData = {
    labels: stats?.importStats?.map(m => MONTHS[m.month - 1]) || [],
    datasets: [
      {
        label: 'Import manuel',
        data: stats?.importStats?.map(m => m.manual) || [],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      },
      {
        label: 'Import IMAP',
        data: stats?.importStats?.map(m => m.imap) || [],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      }
    ]
  };

  const myPerformanceChartData = {
    labels: myPerformance?.monthlyProcessed?.map(m => MONTHS[m._id.month - 1]) || [],
    datasets: [{
      label: 'Courriers traités',
      data: myPerformance?.monthlyProcessed?.map(m => m.count) || [],
      borderColor: 'rgb(34, 197, 94)',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: 'rgb(34, 197, 94)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 35,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { size: 22, weight: '600' }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        padding: 18,
        titleFont: { size: 20, weight: 'bold' },
        bodyFont: { size: 18 },
        cornerRadius: 8,
        displayColors: true
      }
    }
  };

  const barOptions = {
    ...chartOptions,
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 18, weight: '600' } }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { stepSize: 1, font: { size: 18, weight: '600' } }
      }
    }
  };

  const lineOptions = {
    ...chartOptions,
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 18, weight: '600' } }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { stepSize: 1, font: { size: 18, weight: '600' } }
      }
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 pb-8">
      {/* Header avec design moderne */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 text-white shadow-xl"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoLTJ2NGgyem0tNiA2di00aC0ydjRoMnptMC02di00aC0ydjRoMnoiLz48L2c+PC9nPjwvc3ZnPg==')]" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <ChartBarIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Tableau de bord Statistiques</h1>
              <p className="text-white/80 mt-1">Analyse et suivi de vos courriers</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => refetch()} 
              disabled={isFetching}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all duration-200"
            >
              <ArrowPathIcon className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline font-medium">Actualiser</span>
            </button>
            <div className="flex">
              <button 
                onClick={() => exportToPDF(exportOptions)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-600 font-semibold rounded-l-xl hover:bg-white/90 transition-all duration-200 shadow-lg"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
              <button 
                onClick={() => setShowExportModal(true)}
                className="flex items-center px-3 py-2.5 bg-white/90 text-indigo-600 font-semibold rounded-r-xl hover:bg-white transition-all duration-200 shadow-lg border-l border-indigo-100"
                title="Options d'export"
              >
                <Cog6ToothIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filtres collapsibles */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FunnelIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-left">
              <h2 className="font-semibold text-gray-900">Filtres</h2>
              <p className="text-sm text-gray-500">
                {filters.scope === 'all' ? 'Tous les courriers' : filters.scope === 'service' ? 'Mon service' : filters.scope === 'delegated' ? 'Courriers délégués' : 'Mes courriers'}
                {filters.startDate && ` • Depuis ${new Date(filters.startDate).toLocaleDateString('fr-FR')}`}
                {filters.endDate && ` jusqu'au ${new Date(filters.endDate).toLocaleDateString('fr-FR')}`}
              </p>
            </div>
          </div>
          {showFilters ? (
            <ChevronUpIcon className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-gray-100"
            >
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Périmètre</label>
                  <select
                    value={filters.scope}
                    onChange={(e) => setFilters(prev => ({ ...prev, scope: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  >
                    <option value="my">Mes courriers</option>
                    <option value="delegated">Courriers délégués</option>
                    {(canViewService || isServiceResponsible) && (
                      <option value="service">Mon service</option>
                    )}
                    {canViewAll && (
                      <option value="all">Tous les courriers</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date début</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date fin</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>

                {canViewAll && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Service</label>
                      <select
                        value={filters.serviceId}
                        onChange={(e) => setFilters(prev => ({ ...prev, serviceId: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all disabled:opacity-50"
                        disabled={filters.scope === 'my'}
                      >
                        <option value="">Tous les services</option>
                        {services?.map(service => (
                          <option key={service._id} value={service._id}>{service.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Utilisateur</label>
                      <select
                        value={filters.userId}
                        onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all disabled:opacity-50"
                        disabled={filters.scope === 'my'}
                      >
                        <option value="">Tous les utilisateurs</option>
                        {users?.map(u => (
                          <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Zone des graphiques (pour export PDF) */}
      <div ref={chartsRef} className="space-y-6">
        {/* Cards statistiques principales */}
        <motion.div 
          data-export-section="summaryCards"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            title="Total courriers"
            value={stats?.summary?.total || 0}
            icon={DocumentTextIcon}
            gradient="from-blue-500 to-blue-600"
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            delay={0}
          />
          <StatCard
            title="À traiter"
            value={stats?.summary?.pending || 0}
            icon={ExclamationCircleIcon}
            gradient="from-amber-500 to-orange-500"
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            delay={0.1}
          />
          <StatCard
            title="Traités"
            value={stats?.summary?.processed || 0}
            icon={CheckCircleIcon}
            gradient="from-emerald-500 to-green-500"
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            delay={0.2}
          />
          <StatCard
            title="Archivés"
            value={stats?.summary?.archived || 0}
            icon={ArchiveBoxIcon}
            gradient="from-violet-500 to-purple-500"
            iconBg="bg-violet-100"
            iconColor="text-violet-600"
            delay={0.3}
          />
        </motion.div>

        {/* Temps de traitement */}
        <motion.div 
          data-export-section="timeCards"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <TimeCard
            title="Temps moyen"
            value={stats?.processing?.avgTime || 0}
            unit={stats?.processing?.unit || 'h'}
            icon={ClockIcon}
            color="blue"
            description="de traitement"
          />
          <TimeCard
            title="Temps minimum"
            value={stats?.processing?.minTime || 0}
            unit={stats?.processing?.unit || 'h'}
            icon={ArrowTrendingDownIcon}
            color="green"
            description="record le plus rapide"
          />
          <TimeCard
            title="Temps maximum"
            value={stats?.processing?.maxTime || 0}
            unit={stats?.processing?.unit || 'h'}
            icon={ArrowTrendingUpIcon}
            color="red"
            description="le plus long"
          />
        </motion.div>

        {/* Graphiques principaux */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div data-export-section="statusChart">
            <ChartCard title="Répartition par statut" icon={ChartBarIcon}>
              <div className="h-72">
                <Doughnut 
                  data={statusChartData} 
                  options={{
                    ...chartOptions,
                    cutout: '60%',
                    plugins: {
                      ...chartOptions.plugins,
                      legend: { ...chartOptions.plugins.legend, position: 'right' }
                    }
                  }} 
                />
              </div>
            </ChartCard>
          </div>

          <div data-export-section="priorityChart">
            <ChartCard title="Répartition par priorité" icon={ExclamationCircleIcon}>
              <div className="h-72">
                <Pie 
                  data={priorityChartData} 
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: { ...chartOptions.plugins.legend, position: 'right' }
                    }
                  }} 
                />
              </div>
            </ChartCard>
          </div>
        </div>

        {/* Évolution mensuelle */}
        <div data-export-section="monthlyChart">
          <ChartCard title="Évolution mensuelle" icon={CalendarDaysIcon}>
            <div className="h-80">
              <Bar data={monthlyChartData} options={barOptions} />
            </div>
          </ChartCard>
        </div>

        {/* Statistiques d'import */}
        {stats?.importStats?.length > 0 && (
          <div data-export-section="importChart">
            <ChartCard title="Courriers importés" icon={InboxArrowDownIcon}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-blue-700">{stats?.importSummary?.manual || 0}</p>
                  <p className="text-blue-600 text-sm mt-1">Import manuel</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-700">{stats?.importSummary?.imap || 0}</p>
                  <p className="text-emerald-600 text-sm mt-1">Import IMAP</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-purple-700">{(stats?.importSummary?.manual || 0) + (stats?.importSummary?.imap || 0)}</p>
                  <p className="text-purple-600 text-sm mt-1">Total importés</p>
                </div>
              </div>
              <div className="h-72">
                <Bar data={importChartData} options={barOptions} />
              </div>
            </ChartCard>
          </div>
        )}

        {/* Mes performances */}
        <motion.div
          data-export-section="myPerformance"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl overflow-hidden relative"
        >
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <TrophyIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Mes performances</h3>
                <p className="text-white/70 text-sm">Votre activité personnelle</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <p className="text-4xl font-bold">{myPerformance?.performance?.processedByMe || 0}</p>
                <p className="text-white/70 text-sm mt-1">Courriers traités</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <p className="text-4xl font-bold">{myPerformance?.performance?.avgProcessingTime || 0}<span className="text-xl">h</span></p>
                <p className="text-white/70 text-sm mt-1">Temps moyen</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <p className="text-4xl font-bold">{myPerformance?.summary?.pending || 0}</p>
                <p className="text-white/70 text-sm mt-1">En attente</p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 h-64">
              <Line 
                data={myPerformanceChartData} 
                options={{
                  ...lineOptions,
                  plugins: { ...lineOptions.plugins, legend: { display: false } }
                }} 
              />
            </div>
          </div>
        </motion.div>

        {/* Statistiques par utilisateur */}
        {stats?.userStats?.length > 0 && filters.scope !== 'my' && (
          <div data-export-section="userStats">
            <ChartCard title="Performance par utilisateur" icon={UserGroupIcon}>
              <div className="h-80 mb-6">
                <Bar data={userChartData} options={barOptions} />
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Utilisateur</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Traités</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Temps moy.</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.userStats.map((userStat) => (
                    <tr key={userStat._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {userStat.firstName?.charAt(0)}{userStat.lastName?.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900">{userStat.firstName} {userStat.lastName}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {userStat.processed}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4 text-gray-600">{userStat.avgTime ? `${userStat.avgTime}h` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
          </div>
        )}

        {/* Statistiques par service */}
        {stats?.serviceStats?.length > 0 && filters.scope === 'all' && (
          <div data-export-section="serviceStats">
            <ChartCard title="Répartition par service" icon={BuildingOfficeIcon}>
              <div className="h-80 mb-6">
                <Bar data={serviceChartData} options={{ ...barOptions, indexAxis: 'y' }} />
              </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Service</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Total</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">À traiter</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Traités</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Archivés</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.serviceStats.map((service) => (
                    <tr key={service._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: service.color || '#3B82F6' }}
                          />
                          <span className="font-medium text-gray-900">{service.name}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-semibold text-gray-900">{service.total}</td>
                      <td className="text-right py-3 px-4"><span className="text-amber-600 font-medium">{service.pending}</span></td>
                      <td className="text-right py-3 px-4"><span className="text-emerald-600 font-medium">{service.processed}</span></td>
                      <td className="text-right py-3 px-4"><span className="text-violet-600 font-medium">{service.archived}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </ChartCard>
          </div>
        )}

        {/* Top expéditeurs */}
        {stats?.senderStats?.length > 0 && (
          <div data-export-section="senderStats">
            <ChartCard title="Top 10 expéditeurs" icon={SparklesIcon}>
              <div className="h-80">
                <Bar data={senderChartData} options={{ ...barOptions, indexAxis: 'y' }} />
              </div>
            </ChartCard>
          </div>
        )}
      </div>

      {/* Modal d'options d'export */}
      <StatsExportOptionsModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={(opts) => {
          setExportOptions(opts);
          exportToPDF(opts);
        }}
        options={exportOptions}
      />
    </div>
  );
}

// Composant carte statistique amélioré
function StatCard({ title, value, icon: Icon, gradient, iconBg, iconColor, delay = 0 }) {
  return (
    <motion.div
      variants={itemVariants}
      transition={{ delay }}
      className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100 p-5 group hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value.toLocaleString('fr-FR')}</p>
        </div>
        <div className={`p-3 ${iconBg} rounded-xl`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
      
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
    </motion.div>
  );
}

// Composant carte temps
function TimeCard({ title, value, unit, icon: Icon, color, description }) {
  const colorClasses = {
    blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-500', text: 'text-blue-600', value: 'text-blue-700', border: 'border-blue-100' },
    green: { bg: 'bg-emerald-50', iconBg: 'bg-emerald-500', text: 'text-emerald-600', value: 'text-emerald-700', border: 'border-emerald-100' },
    red: { bg: 'bg-red-50', iconBg: 'bg-red-500', text: 'text-red-600', value: 'text-red-700', border: 'border-red-100' }
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      variants={itemVariants}
      className={`${colors.bg} rounded-2xl p-5 border ${colors.border}`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 ${colors.iconBg} rounded-xl shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <p className={`text-sm font-medium ${colors.text}`}>{title}</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-bold ${colors.value}`}>{value}</span>
            <span className={`text-lg ${colors.text}`}>{unit}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}

// Composant carte graphique
function ChartCard({ title, icon: Icon, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Icon className="w-5 h-5 text-indigo-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}
