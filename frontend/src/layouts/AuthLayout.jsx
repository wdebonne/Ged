import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import useBrandingStore from '../stores/brandingStore';

export default function AuthLayout() {
  const { appName, appLogo, footerText, footerVisible, fetchBranding, isLoaded } = useBrandingStore();
  
  // Charger les paramètres de branding au montage
  useEffect(() => {
    if (!isLoaded) {
      fetchBranding();
    }
  }, [isLoaded, fetchBranding]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4 overflow-hidden">
            {appLogo ? (
              <img 
                src={`/uploads/${appLogo}`} 
                alt={appName} 
                className="w-12 h-12 object-contain"
              />
            ) : (
              <svg className="w-10 h-10 text-primary-600" viewBox="0 0 100 100" fill="currentColor">
                <rect x="10" y="15" width="80" height="70" rx="5" />
                <rect x="20" y="30" width="60" height="3" rx="1.5" fill="white" opacity="0.9"/>
                <rect x="20" y="40" width="50" height="3" rx="1.5" fill="white" opacity="0.7"/>
                <rect x="20" y="50" width="55" height="3" rx="1.5" fill="white" opacity="0.7"/>
                <rect x="20" y="60" width="40" height="3" rx="1.5" fill="white" opacity="0.7"/>
              </svg>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">{appName}</h1>
          <p className="text-primary-200 mt-1">Gestion Électronique de Courrier</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <Outlet />
        </div>

        {/* Footer */}
        {footerVisible && (
          <p className="text-center text-primary-200 text-sm mt-6">
            {footerText}
          </p>
        )}
      </motion.div>
    </div>
  );
}
