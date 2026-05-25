// ============================================================
// PHASE 6b – WORKFLOW ENSEIGNANT
// Utilitaire : exportCSV.ts
// Objectif : Exporter les données personnelles en CSV
// ENRICHIE : Ajout des exports détaillés pour classes personnelles
// AJOUT : Export de relevé de notes (ÉTAPE 5)
// ============================================================

/**
 * Convertit un tableau d'objets en chaîne CSV
 * @param data - Tableau d'objets à exporter
 * @param headers - En-têtes personnalisés (optionnel)
 * @returns Chaîne CSV
 */
export function convertToCSV<T extends Record<string, any>>(
  data: T[],
  headers?: string[]
): string {
  if (!data || data.length === 0) return '';

  // Déterminer les en-têtes
  const allHeaders = headers || Object.keys(data[0]);
  
  // Lignes du CSV
  const rows = [
    allHeaders.join(','), // En-têtes
    ...data.map(item => 
      allHeaders.map(header => {
        const value = item[header];
        // Échapper les guillemets et les virgules
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ];
  
  return rows.join('\n');
}

/**
 * Télécharge un fichier CSV
 * @param csvContent - Contenu CSV
 * @param filename - Nom du fichier
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporte un relevé de notes au format CSV (ÉTAPE 5)
 * @param releve - Données du relevé
 * @param eleveNom - Nom de l'élève
 * @param elevePrenom - Prénom de l'élève
 */
export function exportReleveToCSV(
  releve: any,
  eleveNom: string,
  elevePrenom: string
): void {
  // Construction des lignes du CSV
  const rows: string[] = [];

  // En-tête général
  rows.push(`"Élève";"${eleveNom} ${elevePrenom}"`);
  rows.push(`"Classe";"${releve.classe?.nom || ''}"`);
  rows.push(`"Période";"${releve.periode || ''}"`);
  rows.push('');

  // En-têtes des colonnes
  rows.push('"Matière";"Coefficient";"Moyenne";"Rang";"Notes détaillées"');

  // Lignes par matière
  for (const matiere of releve.matieres || []) {
    const notesDetails = matiere.evaluations
      ?.map((e: any) => `${e.titre || 'Évaluation'}: ${e.note || 0}/${e.note_sur || 20}`)
      .join(' | ') || '';
    
    rows.push(`"${matiere.nom}";${matiere.coefficient};${matiere.moyenne || 0};${matiere.rang || '-'};"${notesDetails}"`);
  }

  // Ligne de moyenne générale
  rows.push('');
  rows.push(`"Moyenne générale";;${releve.moyenneGenerale || 0};;`);
  
  if (releve.rang) {
    rows.push(`"Rang dans la classe";;${releve.rang};;`);
  }

  const csvContent = rows.join('\n');
  const fileName = `releve_${eleveNom}_${elevePrenom}_${releve.periode || 'periode'}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
  
  downloadCSV(csvContent, fileName);
}

/**
 * Exporte les classes personnelles d'un enseignant en CSV
 * @param classes - Liste des classes personnelles
 */
export function exportClassesToCSV(classes: any[]): void {
  const flattened = classes.map(c => ({
    id: c.id,
    nom: c.nom,
    description: c.description || '',
    matieres: JSON.stringify(c.matieres),
    eleves: JSON.stringify(c.eleves),
    created_at: c.created_at,
    updated_at: c.updated_at
  }));
  
  const csv = convertToCSV(flattened);
  downloadCSV(csv, `classes_personnelles_${new Date().toISOString().slice(0, 19)}.csv`);
}

/**
 * Exporte une classe personnelle unique avec tous ses détails
 * @param classe - La classe à exporter
 * @param includeMatieres - Inclure les matières (défaut: true)
 * @param includeEleves - Inclure les élèves (défaut: true)
 */
export function exportClassePersonnelleDetail(
  classe: {
    id: string;
    nom: string;
    description?: string | null;
    matieres: any[];
    eleves: any[];
    created_at: string;
    updated_at: string;
  },
  includeMatieres: boolean = true,
  includeEleves: boolean = true
): void {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const baseFilename = `${classe.nom.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}`;
  
  // Exporter les informations de la classe
  const classeInfo = [{
    id: classe.id,
    nom: classe.nom,
    description: classe.description || '',
    created_at: classe.created_at,
    updated_at: classe.updated_at
  }];
  
  const classeCSV = convertToCSV(classeInfo);
  downloadCSV(classeCSV, `${baseFilename}_info.csv`);
  
  // Exporter les matières
  if (includeMatieres && classe.matieres && classe.matieres.length > 0) {
    const matieresData = classe.matieres.map((m: any) => ({
      classe: classe.nom,
      matiere: m.nom,
      coefficient: m.coefficient
    }));
    const matieresCSV = convertToCSV(matieresData);
    downloadCSV(matieresCSV, `${baseFilename}_matieres.csv`);
  }
  
  // Exporter les élèves
  if (includeEleves && classe.eleves && classe.eleves.length > 0) {
    const elevesData = classe.eleves.map((e: any) => ({
      classe: classe.nom,
      nom: e.nom,
      prenom: e.prenom,
      matricule: e.matricule || '',
      date_naissance: e.date_naissance || ''
    }));
    const elevesCSV = convertToCSV(elevesData);
    downloadCSV(elevesCSV, `${baseFilename}_eleves.csv`);
  }
}

/**
 * Exporte les matières personnalisées en CSV
 * @param matieres - Liste des matières
 * @param classeNom - Nom de la classe associée (optionnel)
 */
export function exportMatieresToCSV(matieres: any[], classeNom?: string): void {
  const data = matieres.map(m => ({
    classe: classeNom || '',
    matiere: m.nom,
    coefficient: m.coefficient
  }));
  
  const csv = convertToCSV(data);
  downloadCSV(csv, `matieres_${new Date().toISOString().slice(0, 19)}.csv`);
}

/**
 * Exporte les élèves personnalisés en CSV
 * @param eleves - Liste des élèves
 * @param classeNom - Nom de la classe associée (optionnel)
 */
export function exportElevesToCSV(eleves: any[], classeNom?: string): void {
  const data = eleves.map(e => ({
    classe: classeNom || '',
    nom: e.nom,
    prenom: e.prenom,
    matricule: e.matricule || ''
  }));
  
  const csv = convertToCSV(data);
  downloadCSV(csv, `eleves_${new Date().toISOString().slice(0, 19)}.csv`);
}

/**
 * Exporte un tableau d'élèves avec notes (pour migration)
 * @param eleves - Liste des élèves avec notes
 * @param devoirTitre - Titre du devoir
 */
export function exportElevesWithNotesToCSV(
  eleves: Array<{
    nom: string;
    prenom: string;
    matricule?: string;
    note: number;
    appreciation?: string;
  }>,
  devoirTitre: string
): void {
  const data = eleves.map(e => ({
    nom: e.nom,
    prenom: e.prenom,
    matricule: e.matricule || '',
    note: e.note,
    appreciation: e.appreciation || ''
  }));
  
  const csv = convertToCSV(data);
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  downloadCSV(csv, `notes_${devoirTitre.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}.csv`);
}

/**
 * Exporte toutes les classes personnelles d'un enseignant en un seul fichier ZIP (conceptuel)
 * Note: Pour un vrai ZIP, utiliser une librairie comme jszip
 * @param classes - Liste des classes personnelles
 */
export function exportAllClassesToCSV(classes: any[]): void {
  // Exporter chaque classe individuellement
  for (const classe of classes) {
    exportClassePersonnelleDetail(classe, true, true);
  }
  
  // Exporter également un récapitulatif global
  const recap = classes.map(c => ({
    id: c.id,
    nom: c.nom,
    nb_matieres: c.matieres?.length || 0,
    nb_eleves: c.eleves?.length || 0,
    created_at: c.created_at,
    updated_at: c.updated_at
  }));
  
  const recapCSV = convertToCSV(recap);
  downloadCSV(recapCSV, `classes_personnelles_recap_${new Date().toISOString().slice(0, 19)}.csv`);
}