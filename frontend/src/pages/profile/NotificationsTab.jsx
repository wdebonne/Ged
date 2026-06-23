import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  BellIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const NOTIFICATION_OPTIONS = [
  {
    key: 'email_newMail_recipient',
    label: 'Nouveau courrier (destinataire principal)',
    description: 'Quand un courrier m\'est directement adressé'
  },
  {
    key: 'email_newMail_copy',
    label: 'Nouveau courrier (en copie)',
    description: 'Quand je suis mis en copie d\'un courrier'
  },
  {
    key: 'email_newMail_service',
    label: 'Nouveau courrier de mon service',
    description: 'Quand un courrier arrive dans un service dont je suis superviseur'
  },
  {
    key: 'email_processed',
    label: 'Courrier traité',
    description: 'Quand un courrier dont je suis destinataire est marqué comme traité'
  },
  {
    key: 'email_archived',
    label: 'Courrier archivé',
    description: 'Quand un courrier dont je suis destinataire est archivé'
  },
  {
    key: 'email_reminder',
    label: 'Rappels',
    description: 'Rappels pour les courriers dont l\'échéance approche'
  },
  {
    key: 'email_overdue',
    label: 'Courriers en retard',
    description: 'Alertes pour les courriers dont l\'échéance est dépassée'
  }
];

export default function NotificationsTab() {
  const [useCustom, setUseCustom] = useState(false);
  const [prefs, setPrefs] = useState({});
  const [defaults, setDefaults] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const res = await authAPI.getNotificationPreferences();
      return res.data.data;
    }
  });

  useEffect(() => {
    if (data) {
      setDefaults(data.defaults);
      setUseCustom(data.preferences?.useCustom || false);
      const p = {};
      for (const opt of NOTIFICATION_OPTIONS) {
        const userVal = data.preferences?.[opt.key];
        p[opt.key] = userVal !== null && userVal !== undefined ? userVal : data.defaults[opt.key] ?? true;
      }
      setPrefs(p);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload) => authAPI.updateNotificationPreferences(payload),
    onSuccess: () => {
      toast.success('Préférences de notification enregistrées');
    },
    onError: () => {
      toast.error('Erreur lors de l\'enregistrement');
    }
  });

  const handleSave = () => {
    saveMutation.mutate({ useCustom, ...prefs });
  };

  const handleToggleCustom = (checked) => {
    setUseCustom(checked);
    if (!checked) {
      const resetPrefs = {};
      for (const opt of NOTIFICATION_OPTIONS) {
        resetPrefs[opt.key] = defaults[opt.key] ?? true;
      }
      setPrefs(resetPrefs);
    }
  };

  const getEffectiveValue = (key) => {
    if (!useCustom) return defaults[key] ?? true;
    return prefs[key] ?? defaults[key] ?? true;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <BellIcon className="w-6 h-6 text-primary-600 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold text-gray-900">Notifications par email</h3>
          <p className="text-sm text-gray-500 mt-1">
            Choisissez les notifications email que vous souhaitez recevoir.
            Par défaut, les paramètres globaux définis par l'administrateur s'appliquent.
          </p>
        </div>
      </div>

      {/* Toggle personnalisation */}
      <div className="p-4 bg-gray-50 rounded-lg border">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={useCustom}
            onChange={(e) => handleToggleCustom(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary-600"
          />
          <div>
            <span className="font-medium text-gray-900">Personnaliser mes notifications</span>
            <p className="text-xs text-gray-500">
              {useCustom
                ? 'Vos préférences personnelles sont actives'
                : 'Les paramètres par défaut de l\'application s\'appliquent'}
            </p>
          </div>
        </label>
      </div>

      {/* Info si defaults */}
      {!useCustom && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
          <InformationCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            Les cases ci-dessous indiquent la configuration par défaut.
            Activez "Personnaliser mes notifications" pour les modifier.
          </p>
        </div>
      )}

      {/* Liste des options */}
      <div className="divide-y rounded-lg border overflow-hidden">
        {NOTIFICATION_OPTIONS.map((opt) => {
          const checked = getEffectiveValue(opt.key);
          return (
            <label
              key={opt.key}
              className={`flex items-center gap-4 p-4 transition-colors ${
                useCustom ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-75 cursor-default'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={!useCustom}
                onChange={(e) => setPrefs({ ...prefs, [opt.key]: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 disabled:opacity-50"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                <p className="text-xs text-gray-500">{opt.description}</p>
              </div>
              {!useCustom && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  checked ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {checked ? 'Activé' : 'Désactivé'} par défaut
                </span>
              )}
            </label>
          );
        })}
      </div>

      {/* Bouton sauvegarder */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saveMutation.isLoading}
          className="btn-primary flex items-center gap-2"
        >
          {saveMutation.isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-5 h-5" />
              Enregistrer les préférences
            </>
          )}
        </button>
      </div>
    </div>
  );
}
