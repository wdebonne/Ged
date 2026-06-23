import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  UserCircleIcon,
  CameraIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  UserGroupIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import DelegationsTab from './DelegationsTab';
import NotificationsTab from './NotificationsTab';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [showPasswords, setShowPasswords] = useState({});
  const [activeTab, setActiveTab] = useState('profile');

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const formDataToSend = new FormData();
      formDataToSend.append('firstName', data.firstName);
      formDataToSend.append('lastName', data.lastName);
      formDataToSend.append('email', data.email);
      if (avatarFile) {
        formDataToSend.append('avatar', avatarFile);
      }
      return authAPI.updateProfile(formDataToSend);
    },
    onSuccess: (response) => {
      setUser(response.data.data);
      queryClient.invalidateQueries(['user']);
      setErrors({});
      setAvatarFile(null);
      toast.success('Profil mis à jour avec succès');
    },
    onError: (error) => {
      setErrors({ profile: error.response?.data?.message || 'Erreur lors de la mise à jour' });
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data) => authAPI.changePassword(data),
    onSuccess: () => {
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setErrors({});
    },
    onError: (error) => {
      setErrors({ password: error.response?.data?.message || 'Erreur lors du changement de mot de passe' });
    }
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, avatar: 'L\'image ne doit pas dépasser 5 MB' }));
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setErrors(prev => ({ ...prev, avatar: null }));
    }
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.firstName) newErrors.firstName = 'Le prénom est requis';
    if (!formData.lastName) newErrors.lastName = 'Le nom est requis';
    if (!formData.email) newErrors.email = 'L\'email est requis';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    updateProfileMutation.mutate(formData);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.currentPassword) newErrors.currentPassword = 'Le mot de passe actuel est requis';
    if (!formData.newPassword) newErrors.newPassword = 'Le nouveau mot de passe est requis';
    if (formData.newPassword.length < 8) newErrors.newPassword = 'Le mot de passe doit contenir au moins 8 caractères';
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword
    });
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const roleLabels = {
    admin: 'Administrateur',
    supervisor: 'Superviseur',
    archiviste: 'Archiviste',
    utilisateur: 'Utilisateur',
    observateur: 'Observateur'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-gray-600 mt-1">
          Gérez vos informations personnelles et votre mot de passe
        </p>
      </div>

      {/* Success Messages */}
      {updateProfileMutation.isSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-4 bg-success-50 text-success-700 rounded-lg"
        >
          <CheckCircleIcon className="w-5 h-5" />
          Profil mis à jour avec succès
        </motion.div>
      )}

      {changePasswordMutation.isSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-4 bg-success-50 text-success-700 rounded-lg"
        >
          <CheckCircleIcon className="w-5 h-5" />
          Mot de passe changé avec succès
        </motion.div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'profile'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Informations personnelles
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'password'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Mot de passe
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-4 px-1 border-b-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'notifications'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BellIcon className="w-5 h-5" />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('delegations')}
            className={`pb-4 px-1 border-b-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'delegations'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserGroupIcon className="w-5 h-5" />
            Délégations
          </button>
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              <div className="relative">
                {avatarPreview || user?.avatar ? (
                  <img
                    src={avatarPreview || `/uploads/${user.avatar}`}
                    alt=""
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center">
                    <UserCircleIcon className="w-12 h-12 text-primary-600" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors"
                >
                  <CameraIcon className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Photo de profil</h3>
                <p className="text-sm text-gray-500">JPG, PNG ou GIF. Max 5 MB</p>
                {errors.avatar && (
                  <p className="text-sm text-danger-600 mt-1">{errors.avatar}</p>
                )}
              </div>
            </div>

            {/* User Info Display */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Nom d'utilisateur</span>
                  <p className="font-medium text-gray-900">@{user?.username}</p>
                </div>
                <div>
                  <span className="text-gray-500">Groupe</span>
                  <p className="font-medium text-gray-900">{user?.group?.name || 'Aucun'}</p>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Prénom *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className={`input ${errors.firstName ? 'border-danger-500' : ''}`}
                />
                {errors.firstName && (
                  <p className="text-sm text-danger-600 mt-1">{errors.firstName}</p>
                )}
              </div>
              <div>
                <label className="label">Nom *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className={`input ${errors.lastName ? 'border-danger-500' : ''}`}
                />
                {errors.lastName && (
                  <p className="text-sm text-danger-600 mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="label">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={`input ${errors.email ? 'border-danger-500' : ''}`}
              />
              {errors.email && (
                <p className="text-sm text-danger-600 mt-1">{errors.email}</p>
              )}
            </div>

            {errors.profile && (
              <div className="flex items-center gap-2 p-3 bg-danger-50 text-danger-700 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5" />
                {errors.profile}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updateProfileMutation.isLoading}
                className="btn-primary flex items-center gap-2"
              >
                {updateProfileMutation.isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    Mettre à jour le profil
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div>
              <label className="label">Mot de passe actuel *</label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className={`input pr-10 ${errors.currentPassword ? 'border-danger-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPasswords.current ? (
                    <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-sm text-danger-600 mt-1">{errors.currentPassword}</p>
              )}
            </div>

            <div>
              <label className="label">Nouveau mot de passe *</label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className={`input pr-10 ${errors.newPassword ? 'border-danger-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPasswords.new ? (
                    <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-sm text-danger-600 mt-1">{errors.newPassword}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Minimum 8 caractères
              </p>
            </div>

            <div>
              <label className="label">Confirmer le nouveau mot de passe *</label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className={`input pr-10 ${errors.confirmPassword ? 'border-danger-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPasswords.confirm ? (
                    <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-danger-600 mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {errors.password && (
              <div className="flex items-center gap-2 p-3 bg-danger-50 text-danger-700 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5" />
                {errors.password}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={changePasswordMutation.isLoading}
                className="btn-primary flex items-center gap-2"
              >
                {changePasswordMutation.isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Modification...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    Changer le mot de passe
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <NotificationsTab />
        </motion.div>
      )}

      {/* Delegations Tab */}
      {activeTab === 'delegations' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <DelegationsTab />
        </motion.div>
      )}
    </div>
  );
}
