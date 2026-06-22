import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Connexion
      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/login', { username, password });
          const { token, refreshToken, user } = response.data.data;

          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || 'Erreur de connexion';
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      // Déconnexion
      logout: () => {
        delete api.defaults.headers.common['Authorization'];
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null
        });
      },

      // Mettre à jour les tokens après un rafraîchissement
      updateTokens: (token, refreshToken) => {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        set({ token, refreshToken });
      },

      // Récupérer l'utilisateur actuel
      fetchCurrentUser: async () => {
        const { token } = get();
        if (!token) return;

        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await api.get('/auth/me');
          set({ user: response.data.data.user, isAuthenticated: true });
        } catch (error) {
          // Token invalide, déconnecter
          get().logout();
        }
      },

      // Mettre à jour le profil utilisateur
      updateProfile: async (data) => {
        try {
          const { user } = get();
          const response = await api.put(`/users/${user.id}`, data);
          set({ user: { ...user, ...response.data.data } });
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || 'Erreur de mise à jour';
          return { success: false, error: message };
        }
      },

      // Vérifier une permission
      hasPermission: (permission) => {
        const { user } = get();
        if (!user?.group?.permissions) return false;
        return user.group.permissions.includes(permission);
      },

      // Vérifier si l'utilisateur est dans un groupe spécifique
      isInGroup: (groupName) => {
        const { user } = get();
        return user?.group?.name === groupName;
      },

      // Vérifier si admin ou archiviste (peut importer)
      canImport: () => {
        const { user } = get();
        const allowedGroups = ['Administrateur', 'Archiviste'];
        return allowedGroups.includes(user?.group?.name);
      },

      // Effacer l'erreur
      clearError: () => set({ error: null }),

      // Setter pour l'utilisateur (utilisé par ProfilePage)
      setUser: (user) => set({ user })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

// Initialiser le token au chargement
const storedState = JSON.parse(localStorage.getItem('auth-storage') || '{}');
if (storedState.state?.token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${storedState.state.token}`;
}
