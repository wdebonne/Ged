import { create } from 'zustand';
import { settingsAPI } from '../services/api';

const useBrandingStore = create((set) => ({
  appName: 'GED Courrier',
  appVersion: 'v3.9.17',
  appLogo: '',
  footerText: 'Fait avec ❤️ par le Service Informatique de Pavilly',
  footerVisible: true,
  isLoaded: false,
  isError: false,

  fetchBranding: async () => {
    try {
      const response = await settingsAPI.getBranding();
      const data = response.data.data;

      document.title = data.appName || 'GED Courrier';

      set({
        appName: data.appName,
        appVersion: data.appVersion,
        appLogo: data.appLogo,
        footerText: data.footerText,
        footerVisible: data.footerVisible,
        isLoaded: true,
        isError: false
      });
    } catch (error) {
      console.error('Erreur chargement branding:', error);
      set({ isLoaded: true, isError: true });
    }
  },
  
  updateBranding: (updates) => {
    // Mettre à jour le titre si appName change
    if (updates.appName) {
      document.title = updates.appName;
    }
    set(updates);
  }
}));

export default useBrandingStore;
