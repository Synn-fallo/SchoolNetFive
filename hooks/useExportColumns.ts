// /home/project/hooks/useExportColumns.ts
// Hook pour la gestion des préférences d'export (colonnes + sections)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ExportColumn, 
  DEFAULT_CLASSE_COLUMNS, 
  DEFAULT_MATIERE_COLUMNS,
  EXPORT_COLUMNS_PREF_KEY
} from '@/types/exportColumns.types';
import { ExportSection, EXPORT_SECTIONS, DEFAULT_EXPORT_OPTIONS } from '@/types/export.types';

interface ExportPreferences {
  sections?: ExportSection[];
  format?: 'pdf' | 'excel';
  orientation?: 'portrait' | 'landscape';
  classeColumns?: ExportColumn[];
  matiereColumns?: ExportColumn[];
}

interface UseExportColumnsReturn {
  classeColumns: ExportColumn[];
  matiereColumns: ExportColumn[];
  sections: ExportSection[];
  format: 'pdf' | 'excel';
  orientation: 'portrait' | 'landscape';
  loading: boolean;
  updateClasseColumns: (columns: ExportColumn[]) => Promise<boolean>;
  updateMatiereColumns: (columns: ExportColumn[]) => Promise<boolean>;
  updateSections: (sections: ExportSection[]) => Promise<boolean>;
  updateFormat: (format: 'pdf' | 'excel') => Promise<boolean>;
  updateOrientation: (orientation: 'portrait' | 'landscape') => Promise<boolean>;
  resetToDefaults: () => Promise<void>;
  refresh: () => Promise<void>;
  saveAllPreferences: (prefs: ExportPreferences) => Promise<boolean>;
}

// Sections par défaut selon le type d'export
const getDefaultSections = (type?: 'classe' | 'matiere' | 'periode'): ExportSection[] => {
  if (type === 'classe') {
    return ['header', 'stats', 'classesTable', 'matieresTable', 'signatures', 'footer'];
  }
  if (type === 'matiere') {
    return ['header', 'stats', 'matieresTable', 'signatures', 'footer'];
  }
  return DEFAULT_EXPORT_OPTIONS.sections as ExportSection[];
};

export function useExportColumns(userId: string | undefined, exportType?: 'classe' | 'matiere' | 'periode'): UseExportColumnsReturn {
  const [classeColumns, setClasseColumns] = useState<ExportColumn[]>(DEFAULT_CLASSE_COLUMNS);
  const [matiereColumns, setMatiereColumns] = useState<ExportColumn[]>(DEFAULT_MATIERE_COLUMNS);
  const [sections, setSections] = useState<ExportSection[]>(getDefaultSections(exportType));
  const [format, setFormat] = useState<'pdf' | 'excel'>(DEFAULT_EXPORT_OPTIONS.format as 'pdf' | 'excel');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(DEFAULT_EXPORT_OPTIONS.orientation as 'portrait' | 'landscape');
  const [loading, setLoading] = useState(true);

  const loadPreferences = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Erreur chargement préférences:', error);
        return;
      }

      if (data?.preferences?.[EXPORT_COLUMNS_PREF_KEY]) {
        const saved = data.preferences[EXPORT_COLUMNS_PREF_KEY];
        if (saved.classeColumns) setClasseColumns(saved.classeColumns);
        if (saved.matiereColumns) setMatiereColumns(saved.matiereColumns);
        if (saved.sections) setSections(saved.sections);
        if (saved.format) setFormat(saved.format);
        if (saved.orientation) setOrientation(saved.orientation);
      }
    } catch (err) {
      console.error('Erreur chargement préférences:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const savePreferences = useCallback(async (prefs: ExportPreferences) => {
    if (!userId) return false;

    try {
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .maybeSingle();

      const currentPrefs = existing?.preferences || {};
      
      const newPrefs = {
        ...currentPrefs,
        [EXPORT_COLUMNS_PREF_KEY]: {
          ...currentPrefs[EXPORT_COLUMNS_PREF_KEY],
          ...prefs,
        },
      };

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          preferences: newPrefs,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Erreur sauvegarde préférences:', err);
      return false;
    }
  }, [userId]);

  const updateClasseColumns = useCallback(async (columns: ExportColumn[]): Promise<boolean> => {
    setClasseColumns(columns);
    return await savePreferences({ classeColumns: columns });
  }, [savePreferences]);

  const updateMatiereColumns = useCallback(async (columns: ExportColumn[]): Promise<boolean> => {
    setMatiereColumns(columns);
    return await savePreferences({ matiereColumns: columns });
  }, [savePreferences]);

  const updateSections = useCallback(async (newSections: ExportSection[]): Promise<boolean> => {
    setSections(newSections);
    return await savePreferences({ sections: newSections });
  }, [savePreferences]);

  const updateFormat = useCallback(async (newFormat: 'pdf' | 'excel'): Promise<boolean> => {
    setFormat(newFormat);
    return await savePreferences({ format: newFormat });
  }, [savePreferences]);

  const updateOrientation = useCallback(async (newOrientation: 'portrait' | 'landscape'): Promise<boolean> => {
    setOrientation(newOrientation);
    return await savePreferences({ orientation: newOrientation });
  }, [savePreferences]);

  const resetToDefaults = useCallback(async () => {
    setClasseColumns(DEFAULT_CLASSE_COLUMNS);
    setMatiereColumns(DEFAULT_MATIERE_COLUMNS);
    setSections(getDefaultSections(exportType));
    setFormat(DEFAULT_EXPORT_OPTIONS.format as 'pdf' | 'excel');
    setOrientation(DEFAULT_EXPORT_OPTIONS.orientation as 'portrait' | 'landscape');
    await savePreferences({
      classeColumns: DEFAULT_CLASSE_COLUMNS,
      matiereColumns: DEFAULT_MATIERE_COLUMNS,
      sections: getDefaultSections(exportType),
      format: DEFAULT_EXPORT_OPTIONS.format as 'pdf' | 'excel',
      orientation: DEFAULT_EXPORT_OPTIONS.orientation as 'portrait' | 'landscape',
    });
  }, [savePreferences, exportType]);

  const saveAllPreferences = useCallback(async (prefs: ExportPreferences): Promise<boolean> => {
    if (prefs.classeColumns) setClasseColumns(prefs.classeColumns);
    if (prefs.matiereColumns) setMatiereColumns(prefs.matiereColumns);
    if (prefs.sections) setSections(prefs.sections);
    if (prefs.format) setFormat(prefs.format);
    if (prefs.orientation) setOrientation(prefs.orientation);
    return await savePreferences(prefs);
  }, [savePreferences]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences, userId]);

  return {
    classeColumns,
    matiereColumns,
    sections,
    format,
    orientation,
    loading,
    updateClasseColumns,
    updateMatiereColumns,
    updateSections,
    updateFormat,
    updateOrientation,
    resetToDefaults,
    refresh,
    saveAllPreferences,
  };
}