package com.pokerclock.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class SchemaPatchConfig {

    @Bean
    public CommandLineRunner applySchemaPatches(JdbcTemplate jdbcTemplate) {
        return args -> {
            // Keep schema compatible with existing Docker volumes after adding new tournament runtime fields.
            jdbcTemplate.execute("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS status varchar(32) DEFAULT 'READY'");
            jdbcTemplate.execute("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS entries integer DEFAULT 0");
            jdbcTemplate.execute("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS players_left integer DEFAULT 0");
            jdbcTemplate.execute("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS rebuys integer DEFAULT 0");
            jdbcTemplate.execute("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS accumulated_elapsed_seconds bigint DEFAULT 0");
            jdbcTemplate.execute("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS resumed_at timestamp");

            // Blind schedule rows now support BREAK items with nullable blinds.
            jdbcTemplate.execute("ALTER TABLE registration_blind_levels ADD COLUMN IF NOT EXISTS item_type varchar(16) DEFAULT 'LEVEL'");
            jdbcTemplate.execute("ALTER TABLE registration_blind_levels ALTER COLUMN small_blind DROP NOT NULL");
            jdbcTemplate.execute("ALTER TABLE registration_blind_levels ALTER COLUMN big_blind DROP NOT NULL");
            jdbcTemplate.execute("UPDATE registration_blind_levels SET item_type = 'LEVEL' WHERE item_type IS NULL OR item_type = ''");
        };
    }
}
