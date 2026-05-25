// /home/project/services/etablissementService.ts
// Service pour la gestion des établissements publics (annuaire)

import { supabase } from '@/lib/supabase';
import { EtablissementPublic, EtablissementFilters, EtablissementListResponse, Region, Departement } from '@/types/etablissement.types';

const ITEMS_PER_PAGE = 15; // Modifiable selon les besoins (15, 20, etc.)

export class EtablissementService {
  static async getEtablissements(filters: EtablissementFilters = {}): Promise<EtablissementListResponse> {
    const {
      searchQuery,
      regionId,
      departementId,
      type,
      cycle,
      option,
      page = 1,
      limit = ITEMS_PER_PAGE
    } = filters;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 1. Requête de base sur la vue (qui contient maintenant code_etablissement)
    let query = supabase
      .from('public_etablissements_cards')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('code_etablissement', { ascending: true }); // ✅ Tri par code établissement

    // 2. Filtre par recherche (nom, ville, ou code_etablissement)
    if (searchQuery) {
      const cleanQuery = searchQuery.trim();
      
      // Vérifier si la recherche ressemble à un code (ex: SCH260001)
      const isCodeFormat = /^[A-Z]{3}\d{6}$/i.test(cleanQuery);
      
      if (isCodeFormat) {
        // Maintenant que code_etablissement est dans la vue, on peut filtrer directement
        console.log('🔍 [CODE SEARCH] Recherche par code:', cleanQuery);
        query = query.eq('code_etablissement', cleanQuery.toUpperCase());
      } else {
        // Recherche standard par nom ou ville
        query = query.or(`nom.ilike.%${cleanQuery}%,ville.ilike.%${cleanQuery}%`);
      }
    }

    // 3. Filtre par région
    if (regionId) {
      query = query.eq('region_id', regionId);
    }

    // 4. Filtre par département
    if (departementId) {
      query = query.eq('departement_id', departementId);
    }

    // 5. Filtre par type d'établissement
    if (type && type !== 'tous') {
      query = query.eq('type_etablissement', type);
    }

    // 6. Filtre par cycle
    if (cycle && cycle !== 'tous') {
      const cycleValue = cycle === 'premier' ? 'premier' : 'second';
      query = query.ilike('cycles', `%${cycleValue}%`);
    }

    // 7. Filtre par option
    if (option && option !== 'tous') {
      query = query.ilike('options', `%${option}%`);
    }

    // 8. Exécution de la requête
    const { data, error, count } = await query;

    if (error) {
      console.error('❌ [Service] Erreur Supabase:', error);
      throw error;
    }

    // 9. Formatage des données (plus besoin de récupérer les codes séparément)
    const formattedData: EtablissementPublic[] = (data || []).map(item => ({
      id: item.id,
      nom: item.nom,
      slug: item.slug,
      ville: item.ville,
      type_etablissement: item.type_etablissement,
      regime: item.regime,
      logo_url: item.logo_url,
      taux_reussite: item.taux_reussite,
      likes_count: item.likes_count || 0,
      vues_count: item.vues_count || 0,
      note_moyenne: item.note_moyenne || 0,
      region: item.region,
      departement: item.departement,
      region_id: item.region_id,
      departement_id: item.departement_id,
      badge_annuaire: item.badge_annuaire,
      cycles: item.cycles,
      options: item.options,
      description_courte: item.description_courte,
      etoiles: item.etoiles || '☆☆☆☆☆',
      type_affichage: item.type_affichage,
      code_etablissement: item.code_etablissement || null, // ✅ Maintenant directement disponible
    }));

    return {
      data: formattedData,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  static async getEtablissementBySlug(slug: string): Promise<EtablissementPublic | null> {
    const { data, error } = await supabase
      .from('public_etablissements_cards')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('❌ [Service] Erreur récupération établissement:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      nom: data.nom,
      slug: data.slug,
      ville: data.ville,
      type_etablissement: data.type_etablissement,
      regime: data.regime,
      logo_url: data.logo_url,
      taux_reussite: data.taux_reussite,
      likes_count: data.likes_count || 0,
      vues_count: data.vues_count || 0,
      note_moyenne: data.note_moyenne || 0,
      region: data.region,
      departement: data.departement,
      region_id: data.region_id,
      departement_id: data.departement_id,
      badge_annuaire: data.badge_annuaire,
      cycles: data.cycles,
      options: data.options,
      description_courte: data.description_courte,
      etoiles: data.etoiles || '☆☆☆☆☆',
      type_affichage: data.type_affichage,
      code_etablissement: data.code_etablissement || null,
    };
  }

  static async getRegions(): Promise<Region[]> {
    const { data, error } = await supabase
      .from('regions')
      .select('id, nom')
      .order('ordre', { ascending: true });

    if (error) return [];
    return data || [];
  }

  static async getDepartements(regionId?: string): Promise<Departement[]> {
    let query = supabase
      .from('departements')
      .select('id, nom, region_id')
      .order('ordre', { ascending: true });

    if (regionId) {
      query = query.eq('region_id', regionId);
    }

    const { data, error } = await query;
    if (error) return [];
    return data || [];
  }

  static async getTypes(): Promise<string[]> {
    const { data, error } = await supabase
      .from('public_etablissements_cards')
      .select('type_etablissement')
      .not('type_etablissement', 'is', null);

    if (error) return [];
    const types = [...new Set(data.map(d => d.type_etablissement).filter(Boolean))] as string[];
    return types;
  }

  static async getOptions(): Promise<string[]> {
    const { data, error } = await supabase
      .from('public_etablissements_cards')
      .select('options')
      .not('options', 'is', null);

    if (error) return [];
    
    const allOptions = new Set<string>();
    data.forEach(item => {
      if (item.options) {
        const cleanOptions = item.options.replace(/"/g, '').split(',').map((opt: string) => opt.trim().toUpperCase());
        cleanOptions.forEach((opt: string) => allOptions.add(opt));
      }
    });
    
    return Array.from(allOptions);
  }
}