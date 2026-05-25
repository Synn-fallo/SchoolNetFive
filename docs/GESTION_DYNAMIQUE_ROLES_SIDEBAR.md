# DOCUMENTATION – GESTION DYNAMIQUE DES RÔLES ET DE LA SIDEBAR

**Version :** 1.0  
**Date :** 13/04/2026  
**Auteur :** Équipe technique SchoolNet  

---

## 1. VUE D’ENSEMBLE

Ce document décrit l’architecture et le fonctionnement de la gestion dynamique des rôles et de la sidebar dans SchoolNet.

### 1.1 Objectifs

| Objectif | Description |
|----------|-------------|
| **Rôles complets** | Tous les rôles (visiteur, élève, parent, enseignant, chef, autorité, partenaire, admin) sont gérés |
| **Fonctions spéciales** | DE, AE, Personnel Administratif, Personnel Vie Scolaire s’ajoutent automatiquement |
| **Sidebar dynamique** | Se met à jour immédiatement au changement de rôle |
| **Autorité** | Gestion du périmètre géographique (commune, département, national) |
| **Partenaire** | Gestion des établissements partenaires |

### 1.2 Rôles et périmètres

| Rôle | Périmètre | Établissement associé |
|------|-----------|----------------------|
| Visiteur | Aucun | Non |
| Élève | Aucun | Oui |
| Parent | Aucun | Oui |
| Enseignant | Aucun | Oui |
| Chef d’établissement | Établissement(s) | Oui (peut avoir plusieurs) |
| Autorité | Commune / Département / National | Non |
| Partenaire | Établissements partenaires | Non (lié par table) |
| Admin | National | Non |

---

## 2. STRUCTURE DES DONNÉES

### 2.1 Table `profiles` (colonnes ajoutées)

| Colonne | Type | Description |
|---------|------|-------------|
| `perimetre` | TEXT | `commune`, `departement`, `national` (pour Autorité) |
| `zone_id` | UUID | ID de la commune ou du département |
| `organisation` | TEXT | Nom de l’organisation (pour Partenaire) |
| `organisation_type` | TEXT | `ONG`, `entreprise`, `fondation` |

### 2.2 Table `partenariats_etablissements`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Clé primaire |
| `partenaire_id` | UUID | FK vers `auth.users` |
| `etablissement_id` | UUID | FK vers `etablissements` |
| `statut` | TEXT | `actif`, `suspendu`, `termine` |
| `date_debut` | TIMESTAMPTZ | Date de début du partenariat |
| `date_fin` | TIMESTAMPTZ | Date de fin (optionnelle) |

### 2.3 Table `user_roles.metadata` (pour membre_administratif)

```json
{
  "type_admin": "de",        // de, ae, administratif, vie_scolaire
  "departement": "Atlantique",
  "fonction": "Conseiller pédagogique"
}