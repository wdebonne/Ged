import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authMethod, setAuthMethod] = useState('local');
  const [authConfig, setAuthConfig] = useState({ ldapEnabled: false, kerberosEnabled: false });
  const { login, isLoading, error, clearError } = useAuthStore();

  // Charger la configuration d'authentification au montage
  useEffect(() => {
    const loadAuthConfig = async () => {
      try {
        const response = await authAPI.getConfig();
        if (response.data?.success) {
          setAuthConfig(response.data.data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la configuration auth:', error);
      }
    };
    loadAuthConfig();
  }, []);

  // Vérifier si au moins une méthode alternative est activée
  const hasAlternativeAuth = authConfig.ldapEnabled || authConfig.kerberosEnabled;

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (!username || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const result = await login(username, password, authMethod);
    if (result.success) {
      toast.success('Connexion réussie !');
    } else {
      toast.error(result.error || 'Erreur de connexion');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Connexion</h2>
      <p className="text-gray-600 mb-6">Accédez à votre espace de gestion de courrier</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Auth Method Selector - Affiché uniquement si LDAP ou Kerberos est activé */}
        {hasAlternativeAuth && (
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setAuthMethod('local')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                authMethod === 'local'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Local
            </button>
            {authConfig.ldapEnabled && (
              <button
                type="button"
                onClick={() => setAuthMethod('ldap')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                  authMethod === 'ldap'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                LDAP
              </button>
            )}
            {authConfig.kerberosEnabled && (
              <button
                type="button"
                onClick={() => setAuthMethod('kerberos')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                  authMethod === 'kerberos'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Kerberos
              </button>
            )}
          </div>
        )}

        <div>
          <label htmlFor="username" className="label">
            Nom d'utilisateur ou email
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input"
            placeholder="Entrez votre identifiant"
            autoComplete="username"
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="password" className="label">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="Entrez votre mot de passe"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm"
          >
            {error}
          </motion.div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn-primary py-3"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Connexion en cours...
            </span>
          ) : (
            'Se connecter'
          )}
        </button>

        <div className="text-center">
          <Link
            to="/forgot-password"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Mot de passe oublié ?
          </Link>
        </div>
      </form>
    </div>
  );
}
