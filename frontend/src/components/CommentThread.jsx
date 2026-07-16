import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { mailsAPI, usersAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import {
  ChatBubbleOvalLeftEllipsisIcon,
  PaperAirplaneIcon,
  TrashIcon,
  AtSymbolIcon
} from '@heroicons/react/24/outline';

// Détecte un token "@prefix" en cours de saisie juste avant le caret
// (autorise un espace pour "prénom nom")
const MENTION_REGEX = /(^|\s)@([A-Za-zÀ-ÿ0-9'-]*(?: [A-Za-zÀ-ÿ0-9'-]*)?)$/;

// Surligne les @mentions dans le contenu d'un commentaire
function renderContent(content, mentions) {
  if (!mentions?.length) return content;
  const names = mentions
    .filter(m => m && typeof m === 'object')
    .map(m => `@${m.firstName} ${m.lastName}`);
  if (names.length === 0) return content;
  const escaped = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'g');
  return content.split(regex).map((part, i) =>
    names.includes(part) ? (
      <span key={i} className="text-primary-700 bg-primary-50 dark:text-primary-300 dark:bg-primary-900/40 font-medium rounded px-0.5">
        {part}
      </span>
    ) : (
      part
    )
  );
}

// Fil de commentaires internes d'un courrier, avec @mention → notification
export default function CommentThread({ mailId, comments = [] }) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const currentUserId = user?._id?.toString?.() || user?._id || user?.id;
  const canDeleteAny = user?.group?.permissions?.includes('delete_mails') || false;

  const [content, setContent] = useState('');
  // Utilisateurs insérés via le picker : id → "@Prénom Nom"
  const [insertedMentions, setInsertedMentions] = useState({});
  const [mentionQuery, setMentionQuery] = useState(null); // null = dropdown fermé
  const [activeIndex, setActiveIndex] = useState(0);
  const [composerFocused, setComposerFocused] = useState(false);
  const textareaRef = useRef(null);

  const { data: users } = useQuery({
    queryKey: ['recipients-all'],
    queryFn: async () => {
      const res = await usersAPI.getRecipients({ limit: 500 });
      return res.data.data || [];
    },
    enabled: composerFocused,
    staleTime: 5 * 60 * 1000
  });

  const suggestions = (users || [])
    .filter(u => u._id !== currentUserId)
    .filter(u => {
      if (!mentionQuery) return true;
      const q = mentionQuery.toLowerCase();
      return `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
             `${u.lastName} ${u.firstName}`.toLowerCase().includes(q);
    })
    .slice(0, 6);

  const addCommentMutation = useMutation({
    mutationFn: (data) => mailsAPI.addComment(mailId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['mail', mailId]);
      setContent('');
      setInsertedMentions({});
      setMentionQuery(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'ajout du commentaire');
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => mailsAPI.deleteComment(mailId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['mail', mailId]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  });

  const handleChange = (e) => {
    const value = e.target.value;
    setContent(value);
    const beforeCaret = value.slice(0, e.target.selectionStart);
    const match = beforeCaret.match(MENTION_REGEX);
    if (match) {
      setMentionQuery(match[2]);
      setActiveIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (mentionedUser) => {
    const textarea = textareaRef.current;
    const caret = textarea?.selectionStart ?? content.length;
    const beforeCaret = content.slice(0, caret);
    const afterCaret = content.slice(caret);
    const label = `@${mentionedUser.firstName} ${mentionedUser.lastName}`;
    const newBefore = beforeCaret.replace(MENTION_REGEX, `$1${label} `);
    const newContent = newBefore + afterCaret;
    setContent(newContent);
    setInsertedMentions(prev => ({ ...prev, [mentionedUser._id]: label }));
    setMentionQuery(null);
    // Replacer le caret juste après la mention insérée
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(newBefore.length, newBefore.length);
    });
  };

  const handleKeyDown = (e) => {
    if (mentionQuery !== null && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(suggestions[activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    // Ne conserver que les mentions dont le libellé est encore présent dans le texte
    const mentions = Object.entries(insertedMentions)
      .filter(([, label]) => trimmed.includes(label))
      .map(([id]) => id);
    addCommentMutation.mutate({ content: trimmed, mentions });
  };

  return (
    <>
      <div className="p-4 border-b dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5" />
          Commentaires internes ({comments.length})
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Visibles uniquement en interne — mentionnez un collègue avec @ pour le notifier
        </p>
      </div>
      <div className="p-4">
        {comments.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-6 text-sm">
            Aucun commentaire pour ce courrier
          </p>
        ) : (
          <div className="space-y-4 mb-4">
            {comments.map((comment) => {
              const isAuthor = comment.author?._id === currentUserId;
              return (
                <div key={comment._id} className="flex items-start gap-3">
                  {comment.author?.avatar ? (
                    <img
                      src={`/uploads/${comment.author.avatar}`}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-600 dark:text-primary-400 text-sm font-semibold">
                        {comment.author?.firstName?.[0]}{comment.author?.lastName?.[0]}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {comment.author?.firstName} {comment.author?.lastName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(comment.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                        </span>
                      </div>
                      {(isAuthor || canDeleteAny) && (
                        <button
                          onClick={() => {
                            if (window.confirm('Supprimer ce commentaire ?')) {
                              deleteCommentMutation.mutate(comment._id);
                            }
                          }}
                          disabled={deleteCommentMutation.isLoading}
                          className="text-gray-400 hover:text-danger-600 dark:text-gray-500 dark:hover:text-danger-400 p-0.5 transition-colors"
                          title="Supprimer le commentaire"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mt-1">
                      {renderContent(comment.content, comment.mentions)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Composer */}
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setComposerFocused(true)}
            onBlur={() => setTimeout(() => setMentionQuery(null), 150)}
            rows={2}
            maxLength={2000}
            placeholder="Ajouter un commentaire… (@ pour mentionner)"
            className="input w-full resize-y pr-12"
          />

          {/* Dropdown de mentions */}
          {mentionQuery !== null && suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 w-72 max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-20 dark:bg-gray-800 dark:border-gray-700">
              {suggestions.map((u, i) => (
                <button
                  key={u._id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(u);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    i === activeIndex ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'hover:bg-gray-50 text-gray-700 dark:hover:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  <AtSymbolIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className="font-medium">{u.firstName} {u.lastName}</span>
                  {u.email && <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{u.email}</span>}
                </button>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={!content.trim() || addCommentMutation.isLoading}
            className="absolute right-2 bottom-2 p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Envoyer (Ctrl+Entrée)"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  );
}
