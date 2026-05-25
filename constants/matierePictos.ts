// constants/matierePictos.ts
// Correspondance entre les matières et leurs pictogrammes

interface MatierePicto {
  keywords: string[];
  picto: string;
}

const matieresPictos: MatierePicto[] = [
  { keywords: ['math', 'maths', 'mathématique', 'mathematique', 'algèbre', 'géométrie', 'algebre', 'geometrie'], picto: '📐' },
  { keywords: ['français', 'francais', 'littérature', 'litterature', 'grammaire', 'orthographe', 'rédaction', 'redaction'], picto: '📖' },
  { keywords: ['anglais', 'english'], picto: '🇬🇧' },
  { keywords: ['histoire', 'géographie', 'geographie', 'histoire-géo', 'histoiregeo', 'hg'], picto: '🌍' },
  { keywords: ['sciences', 'svt', 'biologie', 'physique', 'chimie', 'scientifique'], picto: '🔬' },
  { keywords: ['technologie', 'techno', 'informatique', 'info', 'numérique', 'numerique', 'code', 'programmation'], picto: '💻' },
  { keywords: ['sport', 'eps', 'éducation physique', 'education physique', 'gymnastique'], picto: '⚽' },
  { keywords: ['arts', 'art', 'plastique', 'dessin', 'musique', 'chant'], picto: '🎨' },
  { keywords: ['philosophie', 'philo'], picto: '💭' },
  { keywords: ['economie', 'économie', 'gestion', 'comptabilité', 'comptabilite'], picto: '📊' },
  { keywords: ['droit', 'law'], picto: '⚖️' },
  { keywords: ['langue', 'espagnol', 'allemand', 'italien', 'arabe', 'latin'], picto: '🗣️' },
  { keywords: ['religion', 'éducation religieuse', 'education religieuse'], picto: '⛪' },
  { keywords: ['civique', 'éducation civique', 'education civique', 'ecm'], picto: '🏛️' },
  { keywords: ['projet', 'tpe', 'accompagnement', 'orientation'], picto: '📋' },
];

// Mot par défaut pour les matières non trouvées
const DEFAULT_PICTO = '📚';

/**
 * Retourne le pictogramme correspondant à une matière
 * @param matiereNom - Nom de la matière
 * @returns Emoji pictogramme
 */
export function getPictoForMatiere(matiereNom: string): string {
  if (!matiereNom) return DEFAULT_PICTO;
  
  const nomLower = matiereNom.toLowerCase();
  
  for (const item of matieresPictos) {
    for (const keyword of item.keywords) {
      if (nomLower.includes(keyword)) {
        return item.picto;
      }
    }
  }
  
  return DEFAULT_PICTO;
}

/**
 * Ajoute ou modifie un pictogramme pour une matière
 * @param matiereNom - Nom de la matière
 * @param picto - Emoji pictogramme
 */
export function setCustomPictoForMatiere(matiereNom: string, picto: string): void {
  // Cette fonction peut être étendue pour stocker dans AsyncStorage ou Supabase
  console.log(`Custom picto for ${matiereNom}: ${picto}`);
}