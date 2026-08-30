package com.pokerclock.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class SchemaPatchConfig {

    @Bean
    @Order(0)
    public CommandLineRunner applySchemaPatches(JdbcTemplate jdbcTemplate) {
        return args -> {
            jdbcTemplate.execute("UPDATE app_user SET role = 'ADMIN' WHERE UPPER(TRIM(role)) = 'ORGANIZER'");

            // Keep schema compatible with existing Docker volumes after adding new tournament runtime fields.
            jdbcTemplate.execute("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS status varchar(32) DEFAULT 'READY'");
            jdbcTemplate.execute("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS workflow_phase varchar(32)");
            jdbcTemplate.execute("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS version bigint DEFAULT 0 NOT NULL");
            jdbcTemplate.execute("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS entries integer DEFAULT 0");
            jdbcTemplate.execute("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS players_left integer DEFAULT 0");
            jdbcTemplate.execute("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS rebuys integer DEFAULT 0");
            jdbcTemplate.execute("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS accumulated_elapsed_seconds bigint DEFAULT 0");
            jdbcTemplate.execute("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS resumed_at timestamp");
            jdbcTemplate.execute("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS payout_summary_enabled boolean DEFAULT false NOT NULL");
            jdbcTemplate.execute("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS completion_reason varchar(32) DEFAULT 'NONE'");
            jdbcTemplate.execute("UPDATE tournaments SET completion_reason = 'NONE' WHERE completion_reason IS NULL");

            jdbcTemplate.execute("ALTER TABLE registration_templates ADD COLUMN IF NOT EXISTS payout_summary_enabled boolean DEFAULT false NOT NULL");

            jdbcTemplate.execute("ALTER TABLE tournament_result_archives ADD COLUMN IF NOT EXISTS tournament_id bigint");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_tournament_result_archives_tournament_id ON tournament_result_archives (tournament_id)");

            // Blind schedule rows now support BREAK items with nullable blinds.
            jdbcTemplate.execute("ALTER TABLE registration_blind_levels ADD COLUMN IF NOT EXISTS item_type varchar(16) DEFAULT 'LEVEL'");
            jdbcTemplate.execute("ALTER TABLE registration_blind_levels ALTER COLUMN small_blind DROP NOT NULL");
            jdbcTemplate.execute("ALTER TABLE registration_blind_levels ALTER COLUMN big_blind DROP NOT NULL");
            jdbcTemplate.execute("UPDATE registration_blind_levels SET item_type = 'LEVEL' WHERE item_type IS NULL OR item_type = ''");
        };
    }
}
