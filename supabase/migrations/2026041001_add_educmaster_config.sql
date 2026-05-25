-- ============================================================
-- MIGRATION: Configuration EducMaster avec API externe
-- Date: 2026-04-10
-- Description: Tables pour la gestion de l'API EducMaster (Ministère)
-- ============================================================

-- ============================================================
-- PARTIE 1: Table de configuration globale
-- ============================================================

CREATE TABLE IF NOT EXISTS public.config_educmaster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordre_verification VARCHAR(10) DEFAULT 'BDD_API' CHECK (ordre_verification IN ('BDD_API', 'API_BDD')),
  api_enabled BOOLEAN DEFAULT false,
  api_url VARCHAR(255),
  api_key VARCHAR(255),
  api_timeout_ms INT DEFAULT 5000,
  cache_enabled BOOLEAN DEFAULT true,
  cache_ttl_hours INT DEFAULT 24,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.config_educmaster IS 'Configuration globale pour la vérification EducMaster avec API externe';
COMMENT ON COLUMN public.config_educmaster.ordre_verification IS 'Ordre de vérification: BDD_API (base puis API) ou API_BDD (API puis base)';
COMMENT ON COLUMN public.config_educmaster.api_enabled IS 'Activer/désactiver l''appel à l''API externe';
COMMENT ON COLUMN public.config_educmaster.cache_enabled IS 'Activer le cache des réponses API';
COMMENT ON COLUMN public.config_educmaster.cache_ttl_hours IS 'Durée de validité du cache en heures';

-- ============================================================
-- PARTIE 2: Table de cache des réponses API
-- ============================================================

CREATE TABLE IF NOT EXISTS public.educmaster_cache (
  educmaster VARCHAR(20) PRIMARY KEY,
  nom VARCHAR(100),
  prenom VARCHAR(100),
  sexe CHAR(1) CHECK (sexe IN ('M', 'F')),
  date_naissance DATE,
  lieu_naissance VARCHAR(100),
  source VARCHAR(20) DEFAULT 'api',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE public.educmaster_cache IS 'Cache des réponses de l''API EducMaster pour éviter les appels redondants';
COMMENT ON COLUMN public.educmaster_cache.source IS 'Source des données: api, manual, local';
COMMENT ON COLUMN public.educmaster_cache.expires_at IS 'Date d''expiration du cache (basée sur cache_ttl_hours)';

-- ============================================================
-- PARTIE 3: Table de logs des appels API
-- ============================================================

CREATE TABLE IF NOT EXISTS public.educmaster_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  educmaster VARCHAR(20),
  success BOOLEAN NOT NULL,
  response_time_ms INT,
  status_code INT,
  error_message TEXT,
  source_used VARCHAR(10), -- 'cache', 'api', 'local'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.educmaster_api_logs IS 'Journalisation des appels à l''API EducMaster pour statistiques et débogage';

-- ============================================================
-- PARTIE 4: Index pour performances
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_educmaster_cache_educmaster ON public.educmaster_cache(educmaster);
CREATE INDEX IF NOT EXISTS idx_educmaster_cache_expires ON public.educmaster_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_educmaster_logs_created ON public.educmaster_api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_educmaster_logs_success ON public.educmaster_api_logs(success);

-- ============================================================
-- PARTIE 5: Insertion de la configuration par défaut
-- ============================================================

INSERT INTO public.config_educmaster (id, ordre_verification, api_enabled, cache_enabled, cache_ttl_hours)
VALUES (gen_random_uuid(), 'BDD_API', false, true, 24)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PARTIE 6: Fonction pour nettoyer le cache expiré
-- ============================================================

CREATE OR REPLACE FUNCTION clean_expired_educmaster_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.educmaster_cache
  WHERE expires_at < NOW()
  RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clean_expired_educmaster_cache() IS 'Nettoie les entrées de cache expirées';

-- ============================================================
-- PARTIE 7: Vérification post-migration
-- ============================================================

DO $$
BEGIN
  ASSERT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'config_educmaster'), 
    'ERREUR: Table config_educmaster non créée';
  ASSERT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'educmaster_cache'), 
    'ERREUR: Table educmaster_cache non créée';
  ASSERT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'educmaster_api_logs'), 
    'ERREUR: Table educmaster_api_logs non créée';
  
  RAISE NOTICE '✅ Migration réussie: Tables EducMaster créées';
  RAISE NOTICE '   - config_educmaster (configuration)';
  RAISE NOTICE '   - educmaster_cache (cache)';
  RAISE NOTICE '   - educmaster_api_logs (logs)';
  RAISE NOTICE '   - Configuration par défaut: ordre BDD_API, API désactivée';
END $$;