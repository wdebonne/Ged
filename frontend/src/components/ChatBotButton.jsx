import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { settingsAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';

export default function ChatBotButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatRef = useRef(null);
  const { user } = useAuthStore();

  // Fonction pour remplacer les variables dans un message
  const replaceVariables = (text) => {
    if (!text) return text;
    return text
      .replace(/\{\{firstName\}\}/gi, user?.firstName || '')
      .replace(/\{\{lastName\}\}/gi, user?.lastName || '')
      .replace(/\{\{fullName\}\}/gi, user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim())
      .replace(/\{\{email\}\}/gi, user?.email || '')
      .replace(/\{\{username\}\}/gi, user?.username || '');
  };

  // Charger la configuration du chatbot
  const { data: chatbotConfig, isLoading: configLoading } = useQuery({
    queryKey: ['chatbot-config-public'],
    queryFn: async () => {
      const response = await settingsAPI.getChatbotConfig();
      return response.data.data || {};
    },
    staleTime: 5 * 60 * 1000 // Cache 5 minutes
  });

  // Scroll vers le bas quand un nouveau message arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fermer si on clique à l'extérieur
  useEffect(() => {
    if (!chatbotConfig?.featureCloseOutside) return;
    
    const handleClickOutside = (event) => {
      if (chatRef.current && !chatRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, chatbotConfig?.featureCloseOutside]);

  // Ajouter le message d'accueil au premier ouverture
  useEffect(() => {
    if (isOpen && messages.length === 0 && chatbotConfig?.toggleBrandGreetingMessage && chatbotConfig?.brandGreetingMessage) {
      setMessages([
        { type: 'bot', content: replaceVariables(chatbotConfig.brandGreetingMessage) }
      ]);
      
      // Ajouter le prompt si activé
      if (chatbotConfig?.toggleBrandPromptMessage && chatbotConfig?.brandPromptMessage) {
        setTimeout(() => {
          setMessages(prev => [...prev, { type: 'bot', content: replaceVariables(chatbotConfig.brandPromptMessage) }]);
        }, 500);
      }
    }
  }, [isOpen, chatbotConfig, user]);

  // Ne pas afficher si non activé
  if (configLoading || !chatbotConfig?.enabled) return null;

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Appel au webhook n8n
      if (chatbotConfig?.webhookUrl) {
        const headers = {
          'Content-Type': 'application/json'
        };

        // Ajouter l'authentification si configurée
        if (chatbotConfig?.webhookAuthType === 'basic' && chatbotConfig?.webhookAuthUser) {
          const credentials = btoa(`${chatbotConfig.webhookAuthUser}:${chatbotConfig.webhookAuthPassword || ''}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }

        // Générer ou récupérer l'ID de session
        let sessionId = sessionStorage.getItem('chatbot-session');
        if (!sessionId) {
          sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          sessionStorage.setItem('chatbot-session', sessionId);
        }

        // Format compatible avec n8n Chat Trigger
        // n8n attend: action, chatInput, sessionId
        const payload = {
          action: 'sendMessage',
          chatInput: userMessage,
          sessionId: sessionId,
          // Champs supplémentaires pour compatibilité
          message: userMessage,
          route: chatbotConfig?.webhookRoute || 'general'
        };

        console.log('Envoi au chatbot:', payload);

        const response = await fetch(chatbotConfig.webhookUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        console.log('Réponse status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Réponse chatbot:', data);
          // n8n peut renvoyer: output, response, message, text
          const botResponse = data.output || data.response || data.message || data.text || JSON.stringify(data);
          setMessages(prev => [...prev, { type: 'bot', content: botResponse }]);
        } else {
          const errorText = await response.text();
          console.error('Erreur chatbot:', response.status, errorText);
          setMessages(prev => [...prev, { type: 'bot', content: `Erreur ${response.status}: ${errorText || 'Veuillez réessayer.'}` }]);
        }
      } else {
        setMessages(prev => [...prev, { type: 'bot', content: 'Le chatbot n\'est pas configuré correctement.' }]);
      }
    } catch (error) {
      console.error('Erreur chatbot:', error);
      setMessages(prev => [...prev, { type: 'bot', content: 'Erreur de connexion au service.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Styles basés sur la config
  const primaryColor = chatbotConfig?.stylePrimaryColor || '#6366f1';
  const secondaryColor = chatbotConfig?.styleSecondaryColor || '#8b5cf6';
  const bgColor = chatbotConfig?.styleBackgroundColor || '#ffffff';
  const fontColor = chatbotConfig?.styleFontColor || '#333333';
  const userMsgBg = chatbotConfig?.styleUserMessageBg || '#6366f1';
  const userMsgText = chatbotConfig?.styleUserMessageText || '#ffffff';
  const botMsgBg = chatbotConfig?.styleBotMessageBg || '#f3f4f6';
  const botMsgText = chatbotConfig?.styleBotMessageText || '#333333';
  const toggleBg = chatbotConfig?.styleToggleBackground || '#6366f1';
  const toggleShape = chatbotConfig?.styleToggleShape || 'circle';

  const buttonRadius = toggleShape === 'circle' ? '9999px' : toggleShape === 'rounded' ? '12px' : '4px';

  return (
    <div className="fixed bottom-6 right-6 z-50" ref={chatRef}>
      {/* Bouton ChatBot */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 flex items-center justify-center shadow-lg transition-all hover:scale-105 hover:shadow-xl"
        style={{ backgroundColor: toggleBg, borderRadius: buttonRadius }}
        title="Ouvrir le chatbot"
      >
        {chatbotConfig?.styleToggleIcon ? (
          <img src={chatbotConfig.styleToggleIcon} alt="" className="w-8 h-8" />
        ) : (
          <ChatBubbleLeftRightIcon className="w-7 h-7 text-white" />
        )}
      </button>

      {/* Fenêtre de chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={chatRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`fixed z-50 ${
              isFullscreen 
                ? 'inset-4 md:inset-10' 
                : 'bottom-24 right-6 w-96 h-[500px]'
            } rounded-xl shadow-2xl overflow-hidden flex flex-col`}
            style={{ backgroundColor: bgColor }}
          >
            {/* Header */}
            <div 
              className="p-4 flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {chatbotConfig?.toggleBrandLogo && chatbotConfig?.brandLogo && (
                    <img src={chatbotConfig.brandLogo} alt="" className="w-10 h-10 rounded-lg bg-white/20 p-1" />
                  )}
                  <div className="text-white">
                    {chatbotConfig?.toggleBrandName && (
                      <h4 className="font-semibold">{chatbotConfig.brandName}</h4>
                    )}
                    {chatbotConfig?.toggleBrandWelcomeText && (
                      <p className="text-sm opacity-90">{chatbotConfig.brandWelcomeText}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {chatbotConfig?.featureFullscreen && (
                    <button
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {isFullscreen ? (
                        <ArrowsPointingInIcon className="w-5 h-5" />
                      ) : (
                        <ArrowsPointingOutIcon className="w-5 h-5" />
                      )}
                    </button>
                  )}
                  {chatbotConfig?.featureCloseButton && (
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
              {chatbotConfig?.toggleBrandResponseText && (
                <p className="text-white/70 text-xs mt-2">{chatbotConfig.brandResponseText}</p>
              )}
            </div>

            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-3"
              style={{ color: fontColor }}
            >
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} gap-2`}
                >
                  {msg.type === 'bot' && chatbotConfig?.toggleBrandBotAvatar && chatbotConfig?.brandBotAvatar && (
                    <img src={chatbotConfig.brandBotAvatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                  )}
                  <div 
                    className="rounded-lg p-3 max-w-[80%]"
                    style={{ 
                      backgroundColor: msg.type === 'user' ? userMsgBg : botMsgBg,
                      color: msg.type === 'user' ? userMsgText : botMsgText
                    }}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-2">
                  {chatbotConfig?.toggleBrandBotAvatar && chatbotConfig?.brandBotAvatar && (
                    <img src={chatbotConfig.brandBotAvatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                  )}
                  <div 
                    className="rounded-lg p-3"
                    style={{ backgroundColor: botMsgBg, color: botMsgText }}
                  >
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t flex-shrink-0" style={{ borderColor: botMsgBg }}>
              {chatbotConfig?.toggleInfoText && chatbotConfig?.infoText && (
                <p className="text-xs text-gray-500 mb-2 text-center">{chatbotConfig.infoText}</p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={chatbotConfig?.toggleChatPlaceholder ? chatbotConfig.chatPlaceholder : 'Votre message...'}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={{ 
                    borderColor: primaryColor + '40',
                    '--tw-ring-color': primaryColor
                  }}
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  {chatbotConfig?.toggleChatButtonLabel ? chatbotConfig.chatButtonLabel : (
                    <PaperAirplaneIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Footer */}
            {chatbotConfig?.toggleBrandPowered && chatbotConfig?.brandPoweredText && (
              <div className="px-3 py-2 bg-gray-50 text-center flex-shrink-0">
                <p className="text-xs text-gray-500">
                  {chatbotConfig.brandPoweredLink ? (
                    <a href={chatbotConfig.brandPoweredLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {chatbotConfig.brandPoweredText}
                    </a>
                  ) : chatbotConfig.brandPoweredText}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
