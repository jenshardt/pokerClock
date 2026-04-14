package com.pokerclock.config;

import com.pokerclock.service.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class UserSeedConfig {

    private static final Logger LOG = LoggerFactory.getLogger(UserSeedConfig.class);

    @Bean
    public CommandLineRunner seedDefaultUser(
            AuthService authService,
            @Value("${APP_SEED_ADMIN_USERNAME:}") String seedUsername,
            @Value("${APP_SEED_ADMIN_PASSWORD:}") String seedPassword,
            @Value("${APP_SEED_ADMIN_ROLE:ADMIN}") String seedRole
    ) {
        return args -> {
            if (seedUsername == null || seedUsername.isBlank() || seedPassword == null || seedPassword.isBlank()) {
                LOG.info("Skipping admin seed user because APP_SEED_ADMIN_USERNAME and APP_SEED_ADMIN_PASSWORD are not both set.");
                return;
            }

            String normalizedRole = (seedRole == null || seedRole.isBlank()) ? "ADMIN" : seedRole.trim();
            authService.ensureSeedUser(seedUsername.trim(), seedPassword, normalizedRole);
            LOG.info("Admin seed user '{}' ensured.", seedUsername.trim());
        };
    }
}
