/**
 * Utilitaires pour la génération de mots de passe temporaires
 * Conforme à la charte graphique SchoolNet
 */

/**
 * Normalise une chaîne (supprime accents, espaces, caractères spéciaux)
 */
export function normaliserChaine(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Génère un mot de passe temporaire pour un élève
 * Format: prenom + 4 chiffres aléatoires
 * Exemple: "modeste7832"
 */
export function genererMotDePasse(prenom: string): string {
  const prenomNormalise = normaliserChaine(prenom);
  const chiffres = Math.floor(1000 + Math.random() * 9000);
  return `${prenomNormalise}${chiffres}`;
}

/**
 * Vérifie si le mot de passe respecte les critères de base
 */
export function validerMotDePasse(motDePasse: string): boolean {
  return motDePasse.length >= 6;
}

/**
 * Génère un mot de passe aléatoire sécurisé (pour réinitialisation)
 * Format: 8 caractères alphanumériques
 */
export function genererMotDePasseSecurise(): string {
  return Math.random().toString(36).substring(2, 10);
}