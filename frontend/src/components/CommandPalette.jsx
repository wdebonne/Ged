import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Combobox } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  InboxArrowDownIcon,
  PaperAirplaneIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { searchAPI } from '../services/api';

const SECTION_ICONS = {
  mail: InboxArrowDownIcon,
  outgoingMail: PaperAirplaneIcon,
  contact: UserGroupIcon
};

function ResultSection({ label, items }) {
  const Icon = SECTION_ICONS[items[0]?.type];
  return (
    <div className="mb-2">
      <p className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">{label}</p>
      {items.map((item) => (
        <Combobox.Option
          key={`${item.type}-${item.id}`}
          value={item}
          className={({ active }) =>
            `flex items-start gap-3 px-3 py-2 rounded-lg cursor-pointer ${active ? 'bg-primary-50 dark:bg-primary-900/30' : ''}`
          }
        >
          {Icon && <Icon className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />}
          <div className="min-w-0">
            {item.type === 'contact' ? (
              <>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.organization || item.email}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.subject}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {item.type === 'mail' ? item.senderName : item.destinationName}
                  {item.reference ? ` — ${item.reference}` : ''}
                </p>
              </>
            )}
          </div>
        </Combobox.Option>
      ))}
    </div>
  );
}

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen]);

  const trimmed = debouncedQuery.trim();

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', trimmed],
    queryFn: async () => {
      const res = await searchAPI.global(trimmed);
      return res.data.data;
    },
    enabled: isOpen && trimmed.length >= 2
  });

  const mails = data?.mails || [];
  const outgoingMails = data?.outgoingMails || [];
  const contacts = data?.contacts || [];
  const hasResults = mails.length > 0 || outgoingMails.length > 0 || contacts.length > 0;

  const handleSelect = (item) => {
    if (!item) return;
    onClose();
    navigate(item.link);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-start justify-center p-4 pt-[15vh]">
        <Dialog.Panel className="w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden dark:bg-gray-800">
          <Combobox value={null} onChange={handleSelect}>
            <div className="flex items-center gap-2 border-b px-4 dark:border-gray-700">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" />
              <Combobox.Input
                className="w-full border-0 py-4 text-sm focus:ring-0 focus:outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Rechercher un courrier, un contact…"
                displayValue={() => query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>

            <Combobox.Options static className="max-h-96 overflow-y-auto p-2">
              {trimmed.length < 2 ? (
                <p className="px-3 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                  Tapez au moins 2 caractères…
                </p>
              ) : isFetching ? (
                <p className="px-3 py-6 text-center text-sm text-gray-400 dark:text-gray-500">Recherche…</p>
              ) : !hasResults ? (
                <p className="px-3 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                  Aucun résultat pour « {trimmed} »
                </p>
              ) : (
                <>
                  {mails.length > 0 && <ResultSection label={`Entrants (${mails.length})`} items={mails} />}
                  {outgoingMails.length > 0 && <ResultSection label={`Sortants (${outgoingMails.length})`} items={outgoingMails} />}
                  {contacts.length > 0 && <ResultSection label={`Contacts (${contacts.length})`} items={contacts} />}
                </>
              )}
            </Combobox.Options>
          </Combobox>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
