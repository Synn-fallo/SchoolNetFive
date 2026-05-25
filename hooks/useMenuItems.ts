import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBadges } from '@/hooks/useBadges';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import { MenuSection } from '@/types/sidebar.types';
import { useNominationContext } from '@/contexts/NominationContext';
import { useDelegationContext } from '@/contexts/DelegationContext';

// ============================================================
// DÉFINITION DES MENUS PAR RÔLE (SANS "Personnel" ni "Mon profil")
// ============================================================

const menusByRole: Record<string, MenuSection[]> = {
  visiteur: [
    {
      title: 'Navigation',
      items: [
        { id: 'public', icon: 'Home', label: 'Accueil', href: '/(public)' },
        { id: 'demandes', icon: 'FileText', label: 'Mes demandes', href: '/(app)/(sidebar)/institution/mes-demandes' },
        // 🆕 Auto-inscription pour visiteur connecté
        { id: 'auto-inscription', icon: 'FileText', label: "S'inscrire dans un établissement", href: '/auto-inscription' },
      ],
    },
  ],
  eleve: [
    {
      title: 'Principal',
      items: [
        { id: 'accueil', icon: 'Home', label: 'Accueil', href: '/(app)' },
        { id: 'notes', icon: 'BookOpen', label: 'Mes notes', href: '/(app)/notes' },
        { id: 'classe', icon: 'Users', label: 'Ma classe', href: '/(app)/classe' },
        { id: 'messages', icon: 'MessageSquare', label: 'Messages', href: '/(app)/messages' },
      ],
    },
    {
      title: 'Information',
      items: [
        { id: 'annonces', icon: 'Megaphone', label: 'Annonces', href: '/(app)/eleve/annonces' },
      ],
    },
    {
      title: 'Auto-inscription',
      items: [
        { id: 'auto-inscription-eleve', icon: 'FileText', label: "M'inscrire dans un établissement", href: '/auto-inscription' },
      ],
    },
  ],
  parent: [
    {
      title: 'Principal',
      items: [
        { id: 'dashboard', icon: 'LayoutDashboard', label: 'Tableau de bord', href: '/(app)/parent/dashboard' },
        { id: 'enfants', icon: 'Users', label: 'Mes enfants', href: '/(app)/parent/dashboard' },
        { id: 'paiements', icon: 'DollarSign', label: 'Paiements', href: '/(app)/paiements' },
        { id: 'auto-inscription-parent', icon: 'FileText', label: "Inscrire mon enfant", href: '/auto-inscription' },
      ],
    },
    {
      title: 'Classe',
      items: [
        { id: 'espaces-classes', icon: 'MessageCircle', label: 'Espace classes', href: '/(app)/parent/espaces-classes' },
      ],
    },
    {
      title: 'Communication',
      items: [
        { id: 'messages', icon: 'MessageSquare', label: 'Messages', href: '/(app)/parent/messages' },
        { id: 'rendez-vous', icon: 'Calendar', label: 'Rendez-vous', href: '/(app)/parent/rendez-vous' },
        { id: 'annonces', icon: 'Megaphone', label: 'Annonces', href: '/(app)/parent/annonces' },
      ],
    },
    {
      title: 'Contrôle',
      items: [
        { id: 'parental-controls', icon: 'Shield', label: 'Contrôles parentaux', href: '/(app)/parental-controls' },
      ],
    },
  ],
  enseignant: [
    {
      title: 'Tableau de bord',
      items: [
        { id: 'dashboard', icon: 'LayoutDashboard', label: 'Tableau de bord', href: '/(app)/enseignant-tableau-de-bord' },
      ],
    },
    {
      title: 'Classe',
      items: [
        { id: 'espaces-classes', icon: 'MessageCircle', label: 'Espace classes', href: '/(app)/enseignant/espaces-classes' },
      ],
    },
    {
      title: 'Pédagogie',
      items: [
        { id: 'classes', icon: 'Users', label: 'Mes classes', href: '/(app)/enseignant/mes-classes' },
        { id: 'notes', icon: 'BookOpen', label: 'Évaluations & Notes', href: '/(app)/enseignant/notes' },
        { id: 'cahier-texte', icon: 'BookOpen', label: 'Cahier de texte', href: '/(app)/enseignant/cahier-texte' },
      ],
    },
    {
      title: 'Communication',
      items: [
        { id: 'messages', icon: 'MessageSquare', label: 'Messages', href: '/(app)/messages' },
        { id: 'rendez-vous', icon: 'Calendar', label: 'Rendez-vous parents', href: '/(app)/enseignant/rendez-vous' },
        { id: 'publier-annonce', icon: 'Megaphone', label: 'Publier une annonce', href: '/(app)/enseignant/annonces-publier' },
      ],
    },
  ],
  chef_etablissement: [
    {
      title: 'Tableau de bord',
      items: [
        { id: 'dashboard', icon: 'LayoutDashboard', label: 'Dashboard', href: '/(app)' },
        { id: 'scolarite', icon: 'DollarSign', label: 'Scolarité & Finance', href: '/(app)/scolarite' },
        { id: 'notes', icon: 'BookOpen', label: 'Notes', href: '/(app)/notes' },
      ],
    },
    {
      title: 'Supervision',
      items: [
        { id: 'suivi-cours', icon: 'Clock', label: 'Suivi des cours', href: '/(app)/suivi-cours' },
        { id: 'communication-officielle', icon: 'Megaphone', label: 'Communication officielle', href: '/(app)/communication-officielle' },
      ],
    },
    {
      title: 'Gestion des élèves',
      items: [
        { id: 'eleves', icon: 'Users', label: 'Élèves', href: '/(app)/(sidebar)/eleves' },
        { id: 'ajouter-eleve', icon: 'UserPlus', label: 'Ajouter un élève', href: '/(app)/(sidebar)/eleves/ajouter' },
        { id: 'demandes-auto-inscription', icon: 'FileText', label: 'Demandes auto-inscription', href: '/(app)/(sidebar)/eleves/demandes-auto-inscription' },
      ],
    },
    {
      title: 'Gestion des enseignants',
      items: [
        { id: 'enseignants', icon: 'Users', label: 'Enseignants', href: '/(app)/(sidebar)/enseignants' },
        { id: 'invitations', icon: 'Mail', label: 'Invitations', href: '/(app)/(sidebar)/enseignants/invitations' },
        { id: 'delegations', icon: 'UserCheck', label: 'Délégations', href: '/(app)/(sidebar)/delegations' },
      ],
    },
    {
      title: 'Gestion des classes',
      items: [
        { id: 'classes', icon: 'Users', label: 'Classes', href: '/(app)/classes' },
        { id: 'groupes', icon: 'Users', label: 'Groupes', href: '/(app)/(sidebar)/classes/groupes' },
      ],
    },
    {
      title: 'Mes établissements',
      items: [
        { id: 'mes-etablissements', icon: 'Building2', label: 'Mes établissements', href: '/(app)/(sidebar)/mes-etablissements' },
      ],
    },
    {
      title: 'Paramètres',
      items: [
        { id: 'parametres', icon: 'Settings', label: 'Paramètres', href: '/(app)/parametres' },
      ],
    },
  ],
  admin: [
    {
      title: 'Tableau de bord',
      items: [
        { id: 'dashboard', icon: 'LayoutDashboard', label: 'Dashboard', href: '/(app)' },
        { id: 'etablissements', icon: 'Building2', label: 'Établissements', href: '/(app)/etablissements' },
        { id: 'utilisateurs', icon: 'Users', label: 'Utilisateurs', href: '/(app)/utilisateurs' },
        { id: 'finance', icon: 'DollarSign', label: 'Finance', href: '/(app)/finance' },
      ],
    },
    {
      title: 'Gestion des enseignants',
      items: [
        { id: 'enseignants', icon: 'Users', label: 'Enseignants', href: '/(app)/(sidebar)/enseignants' },
        { id: 'invitations', icon: 'Mail', label: 'Invitations', href: '/(app)/(sidebar)/enseignants/invitations' },
      ],
    },
    {
      title: 'Gestion des demandes',
      items: [
        { id: 'demandes-roles', icon: 'Users', label: 'Demandes de rôles', href: '/(app)/(sidebar)/admin/demandes-role' },
        { id: 'demandes-etablissements', icon: 'FileText', label: 'Demandes établissements', href: '/(app)/(sidebar)/admin/demandes-etablissements' },
        { id: 'demandes-partenariats', icon: 'Handshake', label: 'Demandes partenariats', href: '/(app)/(sidebar)/admin/demandes-partenariats' },
      ],
    },
    {
      title: 'Paramètres',
      items: [
        { id: 'educmaster-config', icon: 'Settings', label: 'Configuration EducMaster', href: '/admin/parametres/educmaster' },
      ],
    },
  ],
  autorite: [
    {
      title: 'Supervision',
      items: [
        { id: 'dashboard-autorite', icon: 'LayoutDashboard', label: 'Tableau de bord', href: '/(app)/autorite/dashboard' },
        { id: 'etablissements', icon: 'Building2', label: 'Établissements', href: '/(app)/autorite/etablissements' },
        { id: 'demandes', icon: 'FileText', label: 'Demandes', href: '/(app)/autorite/demandes' },
        { id: 'statistiques', icon: 'BarChart', label: 'Statistiques', href: '/(app)/autorite/statistiques' },
        { id: 'rapports', icon: 'FileText', label: 'Rapports', href: '/(app)/autorite/rapports' },
      ],
    },
  ],
  partenaire: [
    {
      title: 'Partenariat',
      items: [
        { id: 'dashboard-partenaire', icon: 'LayoutDashboard', label: 'Tableau de bord', href: '/(app)/partenaire/dashboard' },
        { id: 'etablissements', icon: 'Building2', label: 'Établissements partenaires', href: '/(app)/partenaire/etablissements' },
        { id: 'offres', icon: 'Gift', label: 'Mes offres', href: '/(app)/partenaire/offres' },
        { id: 'demandes', icon: 'FileText', label: 'Demandes', href: '/(app)/partenaire/demandes' },
        { id: 'rapports', icon: 'FileText', label: 'Rapports', href: '/(app)/partenaire/rapports' },
      ],
    },
  ],
};

// ============================================================
// MENUS DES FONCTIONS SPÉCIALISÉES (sous-types membre_administratif)
// ============================================================

// Menu pour Directeur des Études (DE)
const deSections: MenuSection[] = [
  {
    title: 'Pilotage pédagogique',
    items: [
      { id: 'dashboard-de', icon: 'LayoutDashboard', label: 'Tableau de bord', href: '/(app)/dashboard-de' },
      { id: 'classes', icon: 'Users', label: 'Classes', href: '/(app)/classes' },
      { id: 'groupes', icon: 'Users', label: 'Groupes', href: '/(app)/(sidebar)/classes/groupes' },
      { id: 'matieres', icon: 'BookOpen', label: 'Matières', href: '/(app)/matieres' },
    ],
  },
  {
    title: 'Gestion des élèves',
    items: [
      { id: 'eleves', icon: 'Users', label: 'Élèves', href: '/(app)/(sidebar)/eleves' },
      { id: 'ajouter-eleve', icon: 'UserPlus', label: 'Ajouter un élève', href: '/(app)/(sidebar)/eleves/ajouter' },
      { id: 'demandes-auto-inscription', icon: 'FileText', label: 'Demandes auto-inscription', href: '/(app)/(sidebar)/eleves/demandes-auto-inscription' },
      { id: 'absences', icon: 'CalendarX', label: 'Absences', href: '/(app)/absences' },
      { id: 'incidents', icon: 'AlertTriangle', label: 'Incidents', href: '/(app)/incidents' },
      { id: 'discipline', icon: 'Gavel', label: 'Discipline', href: '/(app)/discipline' },
    ],
  },
  {
    title: 'Gestion des enseignants',
    items: [
      { id: 'enseignants', icon: 'Users', label: 'Enseignants', href: '/(app)/(sidebar)/enseignants' },
      { id: 'invitations', icon: 'Mail', label: 'Invitations', href: '/(app)/(sidebar)/enseignants/invitations' },
      { id: 'delegations', icon: 'UserCheck', label: 'Délégations', href: '/(app)/(sidebar)/delegations' },
    ],
  },
  {
    title: 'Suivi pédagogique',
    items: [
      { id: 'notes-consultation', icon: 'BookOpen', label: 'Notes (consultation)', href: '/(app)/notes' },
      { id: 'bulletins', icon: 'FileText', label: 'Bulletins', href: '/(app)/bulletins' },
      { id: 'emplois', icon: 'Calendar', label: 'Emplois du temps', href: '/(app)/emplois' },
      { id: 'suivi-cours', icon: 'Clock', label: 'Suivi des cours', href: '/(app)/suivi-cours' },
    ],
  },
  {
    title: 'Paramètres',
    items: [
      { id: 'parametres', icon: 'Settings', label: 'Paramètres', href: '/(app)/parametres' },
    ],
  },
];

// Menu pour Animateur d'Établissement (AE)
const aeSections: MenuSection[] = [
  {
    title: 'Mon département',
    items: [
      { id: 'dashboard', icon: 'LayoutDashboard', label: 'Tableau de bord', href: '/(app)' },
      { id: 'enseignants', icon: 'Chalkboard', label: 'Enseignants', href: '/(app)/(sidebar)/enseignants' },
      { id: 'classes', icon: 'Users', label: 'Classes', href: '/(app)/classes' },
      { id: 'groupes', icon: 'Users', label: 'Groupes', href: '/(app)/(sidebar)/classes/groupes' },
      { id: 'notes', icon: 'BookOpen', label: 'Notes', href: '/(app)/notes' },
    ],
  },
  {
    title: 'Invitations',
    items: [
      { id: 'invitations', icon: 'Mail', label: 'Mes invitations', href: '/(app)/(sidebar)/enseignants/invitations' },
    ],
  },
];

// Menu pour Personnel Administratif
const adminSections: MenuSection[] = [
  {
    title: 'Gestion',
    items: [
      { id: 'dashboard', icon: 'LayoutDashboard', label: 'Tableau de bord', href: '/(app)' },
      { id: 'inscriptions', icon: 'FileText', label: 'Inscriptions', href: '/(app)/inscriptions' },
      { id: 'paiements', icon: 'DollarSign', label: 'Paiements', href: '/(app)/paiements' },
      { id: 'factures', icon: 'Receipt', label: 'Factures', href: '/(app)/factures' },
    ],
  },
];

// Menu pour Personnel Vie Scolaire
const vieScolaireSections: MenuSection[] = [
  {
    title: 'Vie scolaire',
    items: [
      { id: 'dashboard', icon: 'LayoutDashboard', label: 'Tableau de bord', href: '/(app)' },
      { id: 'absences', icon: 'CalendarX', label: 'Absences', href: '/(app)/absences' },
      { id: 'incidents', icon: 'AlertTriangle', label: 'Incidents', href: '/(app)/incidents' },
      { id: 'discipline', icon: 'Gavel', label: 'Discipline', href: '/(app)/discipline' },
    ],
  },
];

// Menu pour Assistant Comptable
const assistantComptableSections: MenuSection[] = [
  {
    title: 'Encaissements',
    items: [
      { id: 'nouveau-paiement', icon: 'CreditCard', label: 'Nouveau paiement', href: '/(app)/nouveau-paiement' },
      { id: 'recus', icon: 'Receipt', label: 'Reçus', href: '/(app)/recus' },
      { id: 'historique-encaissements', icon: 'History', label: 'Historique', href: '/(app)/historique-encaissements' },
    ],
  },
  {
    title: 'Paramètres',
    items: [
      { id: 'parametres-caissier', icon: 'Settings', label: 'Paramètres', href: '/(app)/parametres-caissier' },
    ],
  },
];

// Menu pour Comptable
const comptableSections: MenuSection[] = [
  {
    title: 'Finances',
    items: [
      { id: 'dashboard-comptable', icon: 'LayoutDashboard', label: 'Tableau de bord', href: '/(app)/dashboard-comptable' },
      { id: 'encaissements', icon: 'DollarSign', label: 'Encaissements', href: '/(app)/encaissements' },
      { id: 'depots-bancaires', icon: 'Building2', label: 'Dépôts bancaires', href: '/(app)/depots-bancaires' },
      { id: 'rapprochement', icon: 'RefreshCw', label: 'Rapprochement', href: '/(app)/rapprochement' },
    ],
  },
  {
    title: 'Comptabilité',
    items: [
      { id: 'etats-financiers', icon: 'FileText', label: 'États financiers', href: '/(app)/etats-financiers' },
      { id: 'balance', icon: 'Scale', label: 'Balance générale', href: '/(app)/balance' },
      { id: 'grand-livre', icon: 'Book', label: 'Grand livre', href: '/(app)/grand-livre' },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { id: 'factures', icon: 'Receipt', label: 'Factures', href: '/(app)/factures' },
      { id: 'fournisseurs', icon: 'Truck', label: 'Fournisseurs', href: '/(app)/fournisseurs' },
    ],
  },
  {
    title: 'Paramètres',
    items: [
      { id: 'parametres-comptables', icon: 'Settings', label: 'Paramètres', href: '/(app)/parametres-comptables' },
    ],
  },
];

// Menu pour Caissier
const caissierSections: MenuSection[] = [
  {
    title: 'Encaissements',
    items: [
      { id: 'nouveau-paiement', icon: 'CreditCard', label: 'Nouveau paiement', href: '/(app)/nouveau-paiement' },
      { id: 'recus', icon: 'Receipt', label: 'Reçus', href: '/(app)/recus' },
      { id: 'historique-encaissements', icon: 'History', label: 'Historique', href: '/(app)/historique-encaissements' },
    ],
  },
  {
    title: 'Clôture',
    items: [
      { id: 'cloture-caisse', icon: 'Lock', label: 'Clôture caisse', href: '/(app)/cloture-caisse' },
      { id: 'bordereau-versement', icon: 'FileText', label: 'Bordereau de versement', href: '/(app)/bordereau-versement' },
    ],
  },
  {
    title: 'Paramètres',
    items: [
      { id: 'parametres-caissier', icon: 'Settings', label: 'Paramètres', href: '/(app)/parametres-caissier' },
    ],
  },
];

// ============================================================
// MAPPING DES MENUS PAR RÔLE DE DÉLÉGATION/NOMINATION
// ============================================================

const delegationMenuMap: Record<string, MenuSection[]> = {
  caissier: caissierSections,
  assistant_comptable: assistantComptableSections,
  comptable: comptableSections,
  ae: aeSections,
  de: deSections,
  personnel_administratif: adminSections,
  personnel_vie_scolaire: vieScolaireSections,
};

// ============================================================
// HELPER
// ============================================================

const addEtablissementIdToUrl = (href: string, etablissementId?: string): string => {
  if (!etablissementId) return href;
  
  const gestionPages = [
    '/classes', '/notes', '/scolarite', 
    '/enseignants', '/invitations', '/delegations',
    '/groupes', '/devoirs', '/inscriptions', '/paiements', '/factures',
    '/etablissement/gestion', '/etablissement/preview', '/etablissement/abonnement',
    '/parametres', '/demandes-auto-inscription'
  ];
  
  const shouldAddId = gestionPages.some(page => href.includes(page));
  if (!shouldAddId) return href;
  
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}id=${etablissementId}`;
};

// ============================================================
// HOOK PRINCIPAL
// ============================================================

export function useMenuItems() {
  const { 
    activeRole, 
    user,
    adminType,
    perimetre,
    partenariatEtablissements
  } = useAuth();
  
  const { activeDelegatedRoles } = useDelegationContext();
  const { activeNominatedRoles } = useNominationContext();
  
  const { 
    messagesBadge, 
    demandesBadge, 
    invitationsBadge, 
    demandesAutoInscriptionBadge
  } = useBadges();
  
  const { activeEtablissement } = useActiveEtablissement();
  
  const etablissementId = activeEtablissement?.id;

  const menuSections = useMemo(() => {
    if (!user) return [];

    let sections: MenuSection[] = [];

    // 1. Sélection du menu principal selon activeRole
    switch (activeRole) {
      case 'admin':
        sections = [...menusByRole.admin];
        break;
      case 'chef_etablissement':
        sections = [...menusByRole.chef_etablissement];
        break;
      case 'enseignant':
        sections = [...menusByRole.enseignant];
        break;
      case 'eleve':
        sections = [...menusByRole.eleve];
        break;
      case 'parent':
        sections = [...menusByRole.parent];
        break;
      case 'autorite':
        sections = [...menusByRole.autorite];
        break;
      case 'partenaire':
        sections = [...menusByRole.partenaire];
        break;
      case 'visiteur':
        sections = [...menusByRole.visiteur];
        break;
      default:
        sections = [];
    }

    // 2. Ajout des menus des fonctions spéciales (membre_administratif)
    if (adminType) {
      let adminSectionsToAdd: MenuSection[] = [];
      switch (adminType) {
        case 'de':
          adminSectionsToAdd = [...deSections];
          break;
        case 'ae':
          adminSectionsToAdd = [...aeSections];
          break;
        case 'administratif':
          adminSectionsToAdd = [...adminSections];
          break;
        case 'vie_scolaire':
          adminSectionsToAdd = [...vieScolaireSections];
          break;
        case 'comptable':
          adminSectionsToAdd = [...comptableSections];
          break;
        case 'caissier':
          adminSectionsToAdd = [...caissierSections];
          break;
      }
      
      // Fusionner les sections existantes avec les nouvelles
      for (const adminSection of adminSectionsToAdd) {
        const existingSection = sections.find(s => s.title === adminSection.title);
        if (existingSection) {
          existingSection.items = [...existingSection.items, ...adminSection.items];
        } else {
          sections.push(adminSection);
        }
      }
    }

    // 3. Ajout des menus par délégation
    for (const delegatedRole of activeDelegatedRoles) {
      const delegatedMenus = delegationMenuMap[delegatedRole];
      if (delegatedMenus) {
        for (const menuSection of delegatedMenus) {
          const existingSection = sections.find(s => s.title === menuSection.title);
          if (existingSection) {
            const existingItemIds = new Set(existingSection.items.map(i => i.id));
            const newItems = menuSection.items.filter(item => !existingItemIds.has(item.id));
            existingSection.items = [...existingSection.items, ...newItems];
          } else {
            sections.push({ ...menuSection });
          }
        }
      }
    }

    // 4. Ajout des menus par nomination (rôles officiels)
    for (const nominatedRole of activeNominatedRoles) {
      let menuRole = nominatedRole;
      if (nominatedRole === 'de') menuRole = 'de';
      else if (nominatedRole === 'ae') menuRole = 'ae';
      else if (nominatedRole === 'comptable') menuRole = 'comptable';
      else if (nominatedRole === 'caissier') menuRole = 'caissier';
      else if (nominatedRole === 'assistant_comptable') menuRole = 'assistant_comptable';
      else if (nominatedRole === 'administratif') menuRole = 'personnel_administratif';
      else if (nominatedRole === 'vie_scolaire') menuRole = 'personnel_vie_scolaire';

      const nominatedMenus = delegationMenuMap[menuRole];
      if (nominatedMenus) {
        for (const menuSection of nominatedMenus) {
          const existingSection = sections.find(s => s.title === menuSection.title);
          if (existingSection) {
            const existingItemIds = new Set(existingSection.items.map(i => i.id));
            const newItems = menuSection.items.filter(item => !existingItemIds.has(item.id));
            existingSection.items = [...existingSection.items, ...newItems];
          } else {
            sections.push({ ...menuSection });
          }
        }
      }
    }

    // 5. Pour Autorité : log du périmètre
    if (activeRole === 'autorite') {
      console.log('📋 Autorité - Périmètre:', perimetre);
    }

    // 6. Pour Partenaire : log du nombre d'établissements partenaires
    if (activeRole === 'partenaire') {
      console.log('📋 Partenaire - Établissements partenaires:', partenariatEtablissements.length);
    }

    // 7. Ajouter l'ID de l'établissement actif aux URLs
    const sectionsWithIds = sections.map(section => ({
      ...section,
      items: section.items.map(item => ({
        ...item,
        href: addEtablissementIdToUrl(item.href, etablissementId),
      })),
    }));

    // 8. Ajouter les badges
    const sectionsWithBadges = sectionsWithIds.map(section => ({
      ...section,
      items: section.items.map(item => {
        let badge = item.badge;
        
        if (item.id === 'messages' && messagesBadge > 0) {
          badge = messagesBadge;
        }
        if (item.id === 'demandes-etablissements' && demandesBadge > 0) {
          badge = demandesBadge;
        }
        if ((item.id === 'invitations' || item.id === 'enseignants') && invitationsBadge > 0) {
          badge = invitationsBadge;
        }
        if (item.id === 'demandes-auto-inscription' && demandesAutoInscriptionBadge > 0) {
          badge = demandesAutoInscriptionBadge;
        }
        
        return { ...item, badge };
      }),
    }));

    return sectionsWithBadges;
  }, [
    activeRole, 
    user, 
    adminType,
    perimetre,
    partenariatEtablissements,
    messagesBadge, 
    demandesBadge, 
    invitationsBadge, 
    demandesAutoInscriptionBadge,
    etablissementId,
    activeDelegatedRoles,
    activeNominatedRoles
  ]);

  return { menuSections };
}