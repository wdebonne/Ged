import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function OneDriveCallback() {
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      // Envoyer l'erreur à la fenêtre parente
      if (window.opener) {
        window.opener.postMessage({
          type: 'onedrive-callback',
          error: errorDescription || error
        }, window.location.origin);
      }
      return;
    }
    
    if (code) {
      // Envoyer le code à la fenêtre parente
      if (window.opener) {
        window.opener.postMessage({
          type: 'onedrive-callback',
          code
        }, window.location.origin);
      }
    }
  }, [searchParams]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Connexion à OneDrive</h1>
        <p className="text-gray-600">Authentification en cours...</p>
        <p className="text-sm text-gray-500 mt-4">Cette fenêtre se fermera automatiquement.</p>
      </div>
    </div>
  );
}
