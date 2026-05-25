// ============================================================
// PHASE 6b – WORKFLOW ENSEIGNANT
// Utilitaire : importCSV.ts
// Objectif : Importer des données CSV avec validation
// ============================================================

export interface ImportResult<T = any> {
  success: boolean;
  data: T[];
  errors: string[];
  warnings: string[];
  rowsTotal: number;
  rowsImported: number;
  rowsSkipped: number;
}

export interface ImportPreview {
  headers: string[];
  sampleRows: any[];
  totalRows: number;
}

/**
 * Parse un fichier CSV en tableau d'objets
 * @param file - Fichier CSV
 * @returns Promise avec les données parsées
 */
export function parseCSVFile(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      const rows = lines.map(line => {
        // Parser simple des CSV (supporte les guillemets)
        const regex = /(".*?"|[^,]*)(,|$)/g;
        const matches = [];
        let match;
        while ((match = regex.exec(line)) !== null) {
          let value = match[1];
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1).replace(/""/g, '"');
          }
          matches.push(value);
        }
        return matches;
      });
      resolve(rows);
    };
    
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Valide les en-têtes d'un CSV
 * @param headers - En-têtes du fichier
 * @param expectedHeaders - En-têtes attendus
 * @returns Résultat de la validation
 */
export function validateHeaders(
  headers: string[],
  expectedHeaders: string[]
): { valid: boolean; missing: string[]; extra: string[] } {
  const missing = expectedHeaders.filter(h => !headers.includes(h));
  const extra = headers.filter(h => !expectedHeaders.includes(h));
  
  return {
    valid: missing.length === 0,
    missing,
    extra
  };
}

/**
 * Génère un aperçu du CSV avant import
 * @param file - Fichier CSV
 * @returns Promise avec l'aperçu
 */
export async function previewCSV(file: File): Promise<ImportPreview> {
  const rows = await parseCSVFile(file);
  
  if (rows.length === 0) {
    throw new Error('Le fichier est vide');
  }
  
  const headers = rows[0];
  const sampleRows = rows.slice(1, 6).map(row => {
    const obj: any = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx] || '';
    });
    return obj;
  });
  
  return {
    headers,
    sampleRows,
    totalRows: rows.length - 1
  };
}

/**
 * Valide et importe des classes personnelles depuis CSV
 * @param file - Fichier CSV
 * @param enseignantId - ID de l'enseignant
 * @param supabaseClient - Client Supabase
 * @returns Résultat de l'import
 */
export async function importClassesFromCSV(
  file: File,
  enseignantId: string,
  supabaseClient: any
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    data: [],
    errors: [],
    warnings: [],
    rowsTotal: 0,
    rowsImported: 0,
    rowsSkipped: 0
  };
  
  try {
    const rows = await parseCSVFile(file);
    if (rows.length < 2) {
      result.errors.push('Le fichier doit contenir au moins une ligne de données');
      return result;
    }
    
    const headers = rows[0];
    const expectedHeaders = ['nom', 'description', 'matieres', 'eleves'];
    const headerValidation = validateHeaders(headers, expectedHeaders);
    
    if (!headerValidation.valid) {
      result.errors.push(`En-têtes manquants : ${headerValidation.missing.join(', ')}`);
      return result;
    }
    
    result.rowsTotal = rows.length - 1;
    const classesToInsert = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const classe = {
        enseignant_id: enseignantId,
        nom: row[headers.indexOf('nom')],
        description: row[headers.indexOf('description')] || null,
        matieres: (() => {
          try {
            return JSON.parse(row[headers.indexOf('matieres')] || '[]');
          } catch {
            return [];
          }
        })(),
        eleves: (() => {
          try {
            return JSON.parse(row[headers.indexOf('eleves')] || '[]');
          } catch {
            return [];
          }
        })()
      };
      
      if (!classe.nom) {
        result.warnings.push(`Ligne ${i}: nom manquant, ligne ignorée`);
        result.rowsSkipped++;
        continue;
      }
      
      classesToInsert.push(classe);
    }
    
    if (classesToInsert.length > 0) {
      const { data, error } = await supabaseClient
        .from('classes_personnelles')
        .insert(classesToInsert)
        .select();
      
      if (error) throw error;
      
      result.data = data;
      result.rowsImported = data.length;
      result.success = true;
    }
    
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Erreur inconnue');
  }
  
  return result;
}