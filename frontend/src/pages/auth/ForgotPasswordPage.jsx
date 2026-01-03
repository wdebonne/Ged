import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error('Veuillez entrer votre adresse email');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setIsSubmitted(true);
      toast.success('Email envoyé !');
    } catch (error) {
      // On affiche toujours un succès pour des raisons de sécurité
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <EnvelopeIcon className="w-8 h-8 text-success-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Email envoyé !</h2>
        <p className="text-gray-600 mb-6">
          Si un compte existe avec l'adresse <strong>{email}</strong>, vous recevrez un lien de réinitialisation dans quelques instants.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          N'oubliez pas de vérifier vos spams.
        </p>
        <Link to="/login" className="btn-primary">
          Retour à la connexion
        </Link>
      </motion.div>
    );
  }

  return (
    <div>
      <Link
        to="/login"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Retour à la connexion
      </Link>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">Mot de passe oublié</h2>
      <p className="text-gray-600 mb-6">
        Entrez votre adresse email pour recevoir un lien de réinitialisation.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">
            Adresse email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="votre@email.com"
            autoComplete="email"
            autoFocus
          />
        </div>

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
              Envoi en cours...
            </span>
          ) : (
            'Envoyer le lien'
          )}
        </button>
      </form>
    </div>
  );
}
