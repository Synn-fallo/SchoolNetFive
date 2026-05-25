// /home/project/utils/sessionStorage.ts
// Gestion du stockage temporaire du parcours d'inscription

const STORAGE_KEY = 'auto_inscription_session';

export interface InscriptionSession {
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  step: number;
  code_etablissement: string;
  etablissement?: {
    id: string;
    nom: string;
    ville?: string;
  };
  eleve?: {
    educmaster: string;
    nom: string;
    prenom: string;
    sexe: 'M' | 'F';
    date_naissance?: string;
    classe_souhaitee?: string;
    cycle?: string;
    serie?: string;
    option?: string;
  };
  parent?: {
    nom: string;
    prenom: string;
    telephone: string;
    email_personnel: string;
    type_lien: 'pere' | 'mere' | 'tuteur' | 'autre';
  };
  autoFilled?: boolean;
  lastUpdated: string;
}

/**
 * Sauvegarder la session d'inscription
 */
export function saveInscriptionSession(data: Partial<InscriptionSession>): void {
  try {
    const existing = getInscriptionSession();
    const session: InscriptionSession = {
      sessionId: existing?.sessionId || generateSessionId(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      expiresAt: existing?.expiresAt || getExpirationDate(),
      step: data.step ?? existing?.step ?? 1,
      code_etablissement: data.code_etablissement ?? existing?.code_etablissement ?? '',
      etablissement: data.etablissement ?? existing?.etablissement,
      eleve: data.eleve ?? existing?.eleve,
      parent: data.parent ?? existing?.parent,
      autoFilled: data.autoFilled ?? existing?.autoFilled,
      lastUpdated: new Date().toISOString(),
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Erreur sauvegarde session:', error);
  }
}

/**
 * Récupérer la session d'inscription
 */
export function getInscriptionSession(): InscriptionSession | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    
    const session = JSON.parse(data) as InscriptionSession;
    
    // Vérifier si la session a expiré (48h)
    if (new Date(session.expiresAt) < new Date()) {
      clearInscriptionSession();
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Erreur récupération session:', error);
    return null;
  }
}

/**
 * Mettre à jour une partie de la session
 */
export function updateInscriptionSession(updates: Partial<InscriptionSession>): void {
  const current = getInscriptionSession();
  if (current) {
    saveInscriptionSession({ ...current, ...updates });
  } else {
    saveInscriptionSession(updates);
  }
}

/**
 * Effacer la session d'inscription
 */
export function clearInscriptionSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Erreur effacement session:', error);
  }
}

/**
 * Vérifier si une session existe
 */
export function hasInscriptionSession(): boolean {
  return getInscriptionSession() !== null;
}

/**
 * Générer un ID de session unique
 */
function generateSessionId(): string {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * Date d'expiration (48h)
 */
function getExpirationDate(): string {
  const date = new Date();
  date.setHours(date.getHours() + 48);
  return date.toISOString();
}