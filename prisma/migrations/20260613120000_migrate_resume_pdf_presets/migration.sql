-- Migrate legacy resume PDF preset IDs to Phase 1 theme gallery names
UPDATE "UserProfile" SET "resumePdfPreset" = 'classic' WHERE "resumePdfPreset" = 'tschichold';
UPDATE "UserProfile" SET "resumePdfPreset" = 'metro' WHERE "resumePdfPreset" IN ('swiss', 'modern');
