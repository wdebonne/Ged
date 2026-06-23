import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { excelAPI, nextcloudAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  ArrowUpTrayIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  CloudArrowUpIcon,
  FolderIcon,
  TableCellsIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2026)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-12-31)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2026)' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (31-12-2026)' }
];

function NextCloudFilePicker({ value, onChange }) {
  const [currentPath, setCurrentPath] = useState('/');
  const [isOpen, setIsOpen] = useState(false);

  const { data: foldersData } = useQuery({
    queryKey: ['nextcloud-folders', currentPath],
    queryFn: () => nextcloudAPI.listFolders(currentPath),
    enabled: isOpen
  });

  const folders = foldersData?.data?.data || [];

  if (!isOpen) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/chemin/vers/template.xlsx"
          className="input flex-1"
        />
        <button onClick={() => setIsOpen(true)} className="btn-secondary px-3 py-2">
          <FolderIcon className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-gray-50">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Chemin : {currentPath}</span>
        <button onClick={() => setIsOpen(false)} className="text-sm text-gray-500 hover:text-gray-700">Fermer</button>
      </div>
      {currentPath !== '/' && (
        <button
          onClick={() => setCurrentPath(currentPath.split('/').slice(0, -1).join('/') || '/')}
          className="text-sm text-primary-600 hover:underline"
        >
          ← Remonter
        </button>
      )}
      <div className="max-h-40 overflow-y-auto space-y-1">
        {folders.map((item) => (
          <button
            key={item.filename || item.basename}
            onClick={() => {
              const newPath = item.filename || `${currentPath}/${item.basename}`.replace('//', '/');
              if (item.type === 'directory') {
                setCurrentPath(newPath);
              } else if (newPath.endsWith('.xlsx')) {
                onChange(newPath);
                setIsOpen(false);
              }
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left rounded hover:bg-gray-100"
          >
            {item.type === 'directory' ? (
              <FolderIcon className="w-4 h-4 text-yellow-500" />
            ) : (
              <TableCellsIcon className="w-4 h-4 text-green-600" />
            )}
            <span>{item.basename}</span>
            {item.type === 'directory' && <ChevronRightIcon className="w-3 h-3 ml-auto text-gray-400" />}
          </button>
        ))}
        {folders.length === 0 && <p className="text-sm text-gray-400 py-2">Dossier vide</p>}
      </div>
    </div>
  );
}

function ColumnMappingSection({ title, columns, mapping, fields, onChange }) {
  const handleChange = (column, fieldKey) => {
    const newMapping = { ...mapping };
    if (fieldKey === '') {
      delete newMapping[column];
    } else {
      newMapping[column] = fieldKey;
    }
    onChange(newMapping);
  };

  if (!columns || columns.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic py-2">
        Aucune colonne détectée. Uploadez un template pour configurer le mapping.
      </div>
    );
  }

  return (
    <div>
      <h4 className="font-medium text-gray-700 mb-3">{title}</h4>
      <div className="space-y-2">
        {columns.map((col) => (
          <div key={col.column} className="flex items-center gap-3">
            <div className="w-20 flex-shrink-0">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-mono font-medium bg-gray-100 text-gray-700">
                {col.column}
              </span>
            </div>
            <div className="w-40 flex-shrink-0 text-sm text-gray-500 truncate" title={col.header}>
              {col.header || '(vide)'}
            </div>
            <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select
              value={mapping[col.column] || ''}
              onChange={(e) => handleChange(col.column, e.target.value)}
              className="input flex-1"
            >
              <option value="">— Non mappé —</option>
              {fields.map((field) => (
                <option key={field.key} value={field.key}>
                  {field.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExcelRegisterSettings() {
  const queryClient = useQueryClient();

  const [config, setConfig] = useState({
    enabled: false,
    templateSource: 'local',
    templatePath: '',
    nextcloudTemplatePath: '',
    incomingSheetName: 'Courrier Arrivé',
    outgoingSheetName: 'Courrier Départ',
    incomingStartRow: 2,
    outgoingStartRow: 2,
    incomingMapping: {},
    outgoingMapping: {},
    dateFormat: 'DD/MM/YYYY',
    debounceDelay: 30,
    autoSaveToNextCloud: false,
    nextcloudOutputPath: '',
    outputFileName: 'Registre-Courrier-{YEAR}',
    appBaseUrl: ''
  });

  const [selectedIncomingSheet, setSelectedIncomingSheet] = useState('');
  const [selectedOutgoingSheet, setSelectedOutgoingSheet] = useState('');

  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['excel-config'],
    queryFn: () => excelAPI.getConfig()
  });

  const { data: previewData, refetch: refetchPreview } = useQuery({
    queryKey: ['excel-template-preview'],
    queryFn: () => excelAPI.getTemplatePreview(),
    enabled: !!(config.templatePath || config.nextcloudTemplatePath),
    retry: false
  });

  const { data: incomingFieldsData } = useQuery({
    queryKey: ['excel-fields', 'incoming'],
    queryFn: () => excelAPI.getFields('incoming')
  });

  const { data: outgoingFieldsData } = useQuery({
    queryKey: ['excel-fields', 'outgoing'],
    queryFn: () => excelAPI.getFields('outgoing')
  });

  const { data: statusData } = useQuery({
    queryKey: ['excel-status'],
    queryFn: () => excelAPI.getStatus(),
    refetchInterval: 30000
  });

  useEffect(() => {
    if (configData?.data?.data) {
      const d = configData.data.data;
      setConfig(prev => ({
        ...prev,
        ...Object.fromEntries(Object.entries(d).filter(([, v]) => v != null))
      }));
      if (d.incomingSheetName) setSelectedIncomingSheet(d.incomingSheetName);
      if (d.outgoingSheetName) setSelectedOutgoingSheet(d.outgoingSheetName);
    }
  }, [configData]);

  const sheets = previewData?.data?.data || [];
  const incomingFields = incomingFieldsData?.data?.data || [];
  const outgoingFields = outgoingFieldsData?.data?.data || [];
  const status = statusData?.data?.data || {};

  const incomingSheetColumns = sheets.find(s => s.name === selectedIncomingSheet)?.columns || [];
  const outgoingSheetColumns = sheets.find(s => s.name === selectedOutgoingSheet)?.columns || [];

  const saveMutation = useMutation({
    mutationFn: (data) => excelAPI.updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excel-config'] });
      toast.success('Configuration du registre Excel sauvegardée');
    },
    onError: () => toast.error('Erreur lors de la sauvegarde')
  });

  const uploadMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append('template', file);
      return excelAPI.uploadTemplate(formData);
    },
    onSuccess: (res) => {
      setConfig(prev => ({
        ...prev,
        templatePath: res.data?.data?.path || '',
        templateSource: 'local'
      }));
      queryClient.invalidateQueries({ queryKey: ['excel-config'] });
      queryClient.invalidateQueries({ queryKey: ['excel-template-preview'] });
      toast.success('Modèle Excel uploadé');
    },
    onError: () => toast.error("Erreur lors de l'upload du modèle")
  });

  const deleteMutation = useMutation({
    mutationFn: () => excelAPI.deleteTemplate(),
    onSuccess: () => {
      setConfig(prev => ({ ...prev, templatePath: '' }));
      queryClient.invalidateQueries({ queryKey: ['excel-config'] });
      queryClient.invalidateQueries({ queryKey: ['excel-template-preview'] });
      toast.success('Modèle supprimé');
    }
  });

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      uploadMutation.mutate(acceptedFiles[0]);
    }
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024
  });

  const handleSave = () => {
    saveMutation.mutate({
      ...config,
      incomingSheetName: selectedIncomingSheet || config.incomingSheetName,
      outgoingSheetName: selectedOutgoingSheet || config.outgoingSheetName
    });
  };

  if (configLoading) {
    return <div className="flex justify-center py-8"><ArrowPathIcon className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      {config.enabled && (
        <div className={`flex items-center gap-3 p-3 rounded-lg ${status.fileExists ? 'bg-success-50 text-success-700' : 'bg-gray-50 text-gray-600'}`}>
          {status.fileExists ? (
            <CheckCircleIcon className="w-5 h-5" />
          ) : (
            <ExclamationTriangleIcon className="w-5 h-5" />
          )}
          <span className="text-sm">
            {status.fileExists
              ? `Registre actif — Dernière MAJ : ${status.lastUpdateDate ? new Date(status.lastUpdateDate).toLocaleString('fr-FR') : 'jamais'} — ${status.pendingUpdates || 0} en attente`
              : 'Aucun registre généré. Créez ou importez un courrier pour démarrer.'}
          </span>
        </div>
      )}

      {/* Section 1: Activation */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Registre Excel automatique</h3>
          <p className="text-sm text-gray-500">Génère automatiquement un fichier Excel pour chaque courrier créé</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
        </label>
      </div>

      {config.enabled && (
        <>
          {/* Section 2: App URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL de l'application (pour les liens dans le registre)</label>
            <input
              type="text"
              value={config.appBaseUrl}
              onChange={(e) => setConfig(prev => ({ ...prev, appBaseUrl: e.target.value }))}
              placeholder="https://ged.exemple.fr"
              className="input w-full"
            />
            <p className="text-xs text-gray-400 mt-1">Utilisé pour générer les liens vers les pages de détail des courriers</p>
          </div>

          {/* Section 3: Template Source */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-3">Modèle Excel</h3>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="templateSource"
                  value="local"
                  checked={config.templateSource === 'local'}
                  onChange={() => setConfig(prev => ({ ...prev, templateSource: 'local' }))}
                  className="text-primary-600"
                />
                <span className="text-sm">Upload local</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="templateSource"
                  value="nextcloud"
                  checked={config.templateSource === 'nextcloud'}
                  onChange={() => setConfig(prev => ({ ...prev, templateSource: 'nextcloud' }))}
                  className="text-primary-600"
                />
                <span className="text-sm">Depuis NextCloud</span>
              </label>
            </div>

            {config.templateSource === 'local' ? (
              <div>
                {config.templatePath ? (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <TableCellsIcon className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-700 flex-1">Modèle chargé : {config.templatePath}</span>
                    <button onClick={() => deleteMutation.mutate()} className="text-red-500 hover:text-red-700">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <ArrowUpTrayIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {isDragActive ? 'Déposez le fichier ici...' : 'Glissez-déposez un fichier .xlsx ou cliquez pour sélectionner'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Maximum 10 Mo</p>
                  </div>
                )}
                {uploadMutation.isPending && (
                  <p className="text-sm text-primary-600 mt-2 flex items-center gap-2">
                    <ArrowPathIcon className="w-4 h-4 animate-spin" /> Upload en cours...
                  </p>
                )}
              </div>
            ) : (
              <NextCloudFilePicker
                value={config.nextcloudTemplatePath}
                onChange={(val) => setConfig(prev => ({ ...prev, nextcloudTemplatePath: val }))}
              />
            )}

            {(config.templatePath || config.nextcloudTemplatePath) && (
              <button
                onClick={() => refetchPreview()}
                className="btn-secondary mt-3 flex items-center gap-2 text-sm"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Recharger l'aperçu du template
              </button>
            )}
          </div>

          {/* Section 4: Sheet assignment */}
          {sheets.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-800 mb-3">Configuration des feuilles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Feuille courrier arrivé</label>
                  <select
                    value={selectedIncomingSheet}
                    onChange={(e) => setSelectedIncomingSheet(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">— Sélectionner —</option>
                    {sheets.map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                  <label className="block text-sm font-medium text-gray-700 mt-2 mb-1">Ligne de départ</label>
                  <input
                    type="number"
                    min={1}
                    value={config.incomingStartRow}
                    onChange={(e) => setConfig(prev => ({ ...prev, incomingStartRow: parseInt(e.target.value) || 2 }))}
                    className="input w-24"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Feuille courrier départ</label>
                  <select
                    value={selectedOutgoingSheet}
                    onChange={(e) => setSelectedOutgoingSheet(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">— Sélectionner —</option>
                    {sheets.map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                  <label className="block text-sm font-medium text-gray-700 mt-2 mb-1">Ligne de départ</label>
                  <input
                    type="number"
                    min={1}
                    value={config.outgoingStartRow}
                    onChange={(e) => setConfig(prev => ({ ...prev, outgoingStartRow: parseInt(e.target.value) || 2 }))}
                    className="input w-24"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Column Mapping */}
          {sheets.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-800 mb-3">Mapping des colonnes</h3>
              <p className="text-sm text-gray-500 mb-4">Associez chaque colonne de votre modèle à un champ de données</p>

              {selectedIncomingSheet && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <ColumnMappingSection
                    title="Courrier Arrivé"
                    columns={incomingSheetColumns}
                    mapping={config.incomingMapping || {}}
                    fields={incomingFields}
                    onChange={(mapping) => setConfig(prev => ({ ...prev, incomingMapping: mapping }))}
                  />
                </div>
              )}

              {selectedOutgoingSheet && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <ColumnMappingSection
                    title="Courrier Départ"
                    columns={outgoingSheetColumns}
                    mapping={config.outgoingMapping || {}}
                    fields={outgoingFields}
                    onChange={(mapping) => setConfig(prev => ({ ...prev, outgoingMapping: mapping }))}
                  />
                </div>
              )}
            </div>
          )}

          {/* Section 6: Output options */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-3">Options de sortie</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format de date</label>
                <select
                  value={config.dateFormat}
                  onChange={(e) => setConfig(prev => ({ ...prev, dateFormat: e.target.value }))}
                  className="input w-full"
                >
                  {DATE_FORMATS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Délai du buffer (secondes)</label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={config.debounceDelay}
                  onChange={(e) => setConfig(prev => ({ ...prev, debounceDelay: parseInt(e.target.value) || 30 }))}
                  className="input w-32"
                />
                <p className="text-xs text-gray-400 mt-1">Temps d'attente avant mise à jour du fichier après un nouveau courrier</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du fichier de sortie</label>
                <input
                  type="text"
                  value={config.outputFileName}
                  onChange={(e) => setConfig(prev => ({ ...prev, outputFileName: e.target.value }))}
                  placeholder="Registre-Courrier-{YEAR}"
                  className="input w-full"
                />
                <p className="text-xs text-gray-400 mt-1">Variables : {'{YEAR}'}, {'{DATE}'}</p>
              </div>
            </div>
          </div>

          {/* Section 7: NextCloud auto-save */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-3">Sauvegarde NextCloud</h3>
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={config.autoSaveToNextCloud}
                onChange={(e) => setConfig(prev => ({ ...prev, autoSaveToNextCloud: e.target.checked }))}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Sauvegarder automatiquement le registre sur NextCloud après chaque mise à jour</span>
            </label>
            {config.autoSaveToNextCloud && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dossier de destination NextCloud</label>
                <NextCloudFilePicker
                  value={config.nextcloudOutputPath}
                  onChange={(val) => setConfig(prev => ({ ...prev, nextcloudOutputPath: val }))}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Save button */}
      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="btn-primary flex items-center gap-2"
        >
          {saveMutation.isPending ? (
            <>
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-5 h-5" />
              Enregistrer
            </>
          )}
        </button>
      </div>
    </div>
  );
}
