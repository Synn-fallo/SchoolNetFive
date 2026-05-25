// /home/project/utils/exportUtils.ts
// Utilitaires pour la génération d'exports enrichis (CSV/Excel)

import { ExportOptions, ExportClasseData, ExportMatiereData, ExportPeriodeData } from '@/types/export.types';

/**
 * Formate un nombre avec 2 décimales
 */
export const formatNumber = (value: number, decimals: number = 2): string => {
  return value.toFixed(decimals);
};

/**
 * Formate une date pour l'export
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Génère le CSV pour un export par classe
 */
export const generateClasseCSV = (data: ExportClasseData, options: ExportOptions): string => {
  const rows: string[] = [];
  
  // En-tête établissement
  if (options.sections.includes('header')) {
    rows.push(`"ETABLISSEMENT";"${data.etablissementNom}"`);
    rows.push(`"CLASSE";"${data.classe.nom}"`);
    rows.push(`"PERIODE";"${data.periode}"`);
    rows.push(`"ANNEE SCOLAIRE";"${data.anneeScolaire}"`);
    rows.push(`"DATE EDITION";"${formatDate(new Date())}"`);
    rows.push('');
  }
  
  // Statistiques générales
  if (options.sections.includes('stats')) {
    rows.push('"STATISTIQUES GENERALES"');
    rows.push(`"Effectif";"${data.classe.effectif}"`);
    rows.push(`"Moyenne classe";"${formatNumber(data.statsGenerales.moyenneClasse)}/20"`);
    rows.push(`"Taux de réussite";"${formatNumber(data.statsGenerales.tauxReussite)}%"`);
    rows.push(`"Meilleure moyenne";"${formatNumber(data.statsGenerales.meilleureMoyenne)}/20"`);
    if (data.statsGenerales.meilleurEleve) {
      rows.push(`"Meilleur élève";"${data.statsGenerales.meilleurEleve}"`);
    }
    rows.push(`"Plus faible moyenne";"${formatNumber(data.statsGenerales.plusFaibleMoyenne)}/20"`);
    if (data.statsGenerales.plusFaibleEleve) {
      rows.push(`"Élève à soutenir";"${data.statsGenerales.plusFaibleEleve}"`);
    }
    rows.push('');
  }
  
  // Détail par matière
  if (options.sections.includes('matieresTable')) {
    rows.push('"DETAIL PAR MATIERE"');
    rows.push(`"Matière";"Coeff.";"Moyenne";"Meilleure note";"Plus faible note";"Notes"`);
    for (const matiere of data.matieres) {
      rows.push(`"${matiere.nom}";${matiere.coefficient};${formatNumber(matiere.moyenne)};${formatNumber(matiere.meilleureNote)};${formatNumber(matiere.plusFaibleNote)};${matiere.notesCount}`);
    }
    rows.push('');
  }
  
  // Liste des élèves
  if (options.sections.includes('elevesList')) {
    rows.push('"LISTE DES ELEVES"');
    rows.push(`"Rang";"Matricule";"Nom";"Prénom";"Moyenne";"Appréciation";"Nb notes"`);
    for (const eleve of data.eleves) {
      rows.push(`${eleve.rang};"${eleve.matricule}";"${eleve.nom}";"${eleve.prenom}";${formatNumber(eleve.moyenne)};"${eleve.appreciation}";${eleve.notesCount}`);
      
      // Détail par matière pour l'élève (optionnel)
      if (eleve.detailsParMatiere && eleve.detailsParMatiere.length > 0) {
        for (const detail of eleve.detailsParMatiere) {
          rows.push(`;;;"   - ${detail.matiere}: ${formatNumber(detail.note)}/20 (Rang: ${detail.rang})"`);
        }
      }
    }
    rows.push('');
  }
  
  // Pied de page
  if (options.sections.includes('footer')) {
    rows.push('');
    rows.push(`"Document généré par SchoolNet - ${formatDate(new Date())}"`);
    rows.push('"Authentification possible par code QR"');
  }
  
  return rows.join('\n');
};

/**
 * Génère le CSV pour un export par matière
 */
export const generateMatiereCSV = (data: ExportMatiereData, options: ExportOptions): string => {
  const rows: string[] = [];
  
  // En-tête
  if (options.sections.includes('header')) {
    rows.push(`"ETABLISSEMENT";"${data.etablissementNom}"`);
    rows.push(`"MATIERE";"${data.matiere.nom} (Coeff. ${data.matiere.coefficient})"`);
    rows.push(`"CLASSE";"${data.classe.nom}"`);
    rows.push(`"PERIODE";"${data.periode}"`);
    rows.push(`"ANNEE SCOLAIRE";"${data.anneeScolaire}"`);
    rows.push(`"DATE EDITION";"${formatDate(new Date())}"`);
    rows.push('');
  }
  
  // Statistiques
  if (options.sections.includes('stats')) {
    rows.push('"STATISTIQUES"');
    rows.push(`"Effectif";"${data.classe.effectif}"`);
    rows.push(`"Moyenne classe";"${formatNumber(data.stats.moyenneClasse)}/20"`);
    rows.push(`"Écart-type";"${formatNumber(data.stats.ecartType)}"`);
    rows.push(`"Taux de réussite";"${formatNumber(data.stats.tauxReussite)}%"`);
    rows.push(`"Meilleure note";"${formatNumber(data.stats.meilleureNote)}/20"`);
    if (data.stats.meilleurEleve) {
      rows.push(`"Meilleur élève";"${data.stats.meilleurEleve}"`);
    }
    rows.push(`"Plus faible note";"${formatNumber(data.stats.plusFaibleNote)}/20"`);
    if (data.stats.plusFaibleEleve) {
      rows.push(`"Élève à soutenir";"${data.stats.plusFaibleEleve}"`);
    }
    rows.push('');
  }
  
  // Liste des élèves
  if (options.sections.includes('elevesList')) {
    rows.push('"LISTE DES ELEVES"');
    rows.push(`"Rang";"Matricule";"Nom";"Prénom";"Note";"Appréciation"`);
    for (const eleve of data.eleves) {
      rows.push(`${eleve.rang};"${eleve.matricule}";"${eleve.nom}";"${eleve.prenom}";${formatNumber(eleve.note)};"${eleve.appreciation}"`);
    }
    rows.push('');
  }
  
  // Pied de page
  if (options.sections.includes('footer')) {
    rows.push('');
    rows.push(`"Document généré par SchoolNet - ${formatDate(new Date())}"`);
    rows.push('"Authentification possible par code QR"');
  }
  
  return rows.join('\n');
};

/**
 * Génère le CSV pour un export par période (rapport complet)
 */
export const generatePeriodeCSV = (data: ExportPeriodeData, options: ExportOptions): string => {
  const rows: string[] = [];
  
  // En-tête
  if (options.sections.includes('header')) {
    rows.push(`"ETABLISSEMENT";"${data.etablissement.nom}"`);
    rows.push(`"PERIODE";"${data.periode}"`);
    rows.push(`"ANNEE SCOLAIRE";"${data.anneeScolaire}"`);
    rows.push(`"REGIME";"${data.etablissement.regime === 'semestre' ? 'Semestriel' : 'Trimestriel'}"`);
    rows.push(`"DATE EDITION";"${formatDate(new Date(data.dateGeneration))}"`);
    rows.push('');
  }
  
  // Statistiques globales
  if (options.sections.includes('stats')) {
    rows.push('"STATISTIQUES GENERALES"');
    rows.push(`"Total élèves";"${data.statsGlobales.totalEleves}"`);
    rows.push(`"Moyenne générale";"${formatNumber(data.statsGlobales.moyenneGenerale)}/20"`);
    rows.push(`"Taux de réussite";"${formatNumber(data.statsGlobales.tauxReussite)}%"`);
    rows.push(`"Meilleure classe";"${data.statsGlobales.meilleureClasse.nom} (${formatNumber(data.statsGlobales.meilleureClasse.moyenne)}/20)"`);
    rows.push(`"Classe à améliorer";"${data.statsGlobales.plusFaibleClasse.nom} (${formatNumber(data.statsGlobales.plusFaibleClasse.moyenne)}/20)"`);
    rows.push('');
  }
  
  // Moyennes par classe
  if (options.sections.includes('classesTable')) {
    rows.push('"MOYENNES PAR CLASSE"');
    rows.push(`"Classe";"Effectif";"Moyenne";"Rang";"Taux réussite";"Meilleure moyenne";"Plus faible moyenne"`);
    for (const classe of data.classesStats) {
      rows.push(`"${classe.nom}";${classe.effectif};${formatNumber(classe.moyenneGenerale)};${classe.rang};${formatNumber(classe.tauxReussite)}%;${formatNumber(classe.meilleureMoyenne)};${formatNumber(classe.plusFaibleMoyenne)}`);
    }
    rows.push('');
  }
  
  // Détail par matière
  if (options.sections.includes('matieresTable')) {
    rows.push('"DETAIL PAR MATIERE"');
    rows.push(`"Matière";"Coeff.";"Moyenne établissement";"Meilleure classe";"Plus faible classe"`);
    for (const matiere of data.matieresStats) {
      rows.push(`"${matiere.nom}";${matiere.coefficient};${formatNumber(matiere.moyenneEtablissement)};"${matiere.meilleureClasse}";"${matiere.plusFaibleClasse}"`);
    }
    rows.push('');
  }
  
  // Tableau d'honneur
  if (options.sections.includes('tableauHonneur') && data.tableauHonneur && data.tableauHonneur.length > 0) {
    rows.push('"TABLEAU D\'HONNEUR"');
    rows.push(`"Rang";"Classe";"Nom";"Prénom";"Moyenne";"Mention"`);
    for (const eleve of data.tableauHonneur) {
      const mention = eleve.mention === 'felicitations' ? 'Félicitations' : eleve.mention === 'encouragement' ? 'Encouragements' : 'Tableau d\'honneur';
      rows.push(`${eleve.rang};"${eleve.classe}";"${eleve.nom}";"${eleve.prenom}";${formatNumber(eleve.moyenne)};"${mention}"`);
    }
    rows.push('');
  }
  
  // Pied de page
  if (options.sections.includes('footer')) {
    rows.push('');
    rows.push(`"Document généré par SchoolNet - ${formatDate(new Date())}"`);
    rows.push('"Authentification possible par code QR"');
  }
  
  return rows.join('\n');
};