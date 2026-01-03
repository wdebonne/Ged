import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { CheckCircleIcon, LockClosedIcon } from '@heroicons/react/24/outline';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      setIsSuccess(true);
      toast.success('Mot de passe réinitialisé !');
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la réinitialisation';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircleIcon className="w-8 h-8 text-success-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Mot de passe modifié !</h2>
        <p className="text-gray-600 mb-6">
          Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
        </p>
        <Link to="/login" className="btn-primary">
          Se connecter
        </Link>
      </motion.div>
    );
  }

  return (
    <div>
      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <LockClosedIcon className="w-6 h-6 text-primary-600" />
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        Nouveau mot de passe
      </h2>
      <p className="text-gray-600 mb-6 text-center">
        Choisissez un nouveau mot de passe sécurisé.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="label">
            Nouveau mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="Minimum 6 caractères"
            autoComplete="new-password"
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">
            Confirmer le mot de passe
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
            placeholder="Répétez le mot de passe"
            autoComplete="new-password"
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
              Réinitialisation...
            </span>
          ) : (
            'Réinitialiser le mot de passe'
          )}
        </button>

        <div className="text-center">
          <Link
            to="/login"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Retour à la connexion
          </Link>
        </div>
      </form>
    </div>
  );
}
