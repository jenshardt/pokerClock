package com.pokerclock.config;

import com.pokerclock.service.AuthService;
import com.pokerclock.model.UserRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import tools.jackson.databind.ObjectMapper;

@Configuration
public class UserSeedConfig {

    private static final Logger LOG = LoggerFactory.getLogger(UserSeedConfig.class);

    @Bean
    @Order(1)
    public CommandLineRunner seedUsers(
            AuthService authService,
            ObjectMapper objectMapper,
            @Value("${APP_SEED_USERS_FILE:}") String seedUsersFile
    ) {
        return args -> {
            if (seedUsersFile == null || seedUsersFile.isBlank()) {
                LOG.info("Skipping user seeding because APP_SEED_USERS_FILE is not set.");
                return;
            }

            List<SeedUser> users = readSeedUsers(objectMapper, Path.of(seedUsersFile));
            for (SeedUser seedUser : users) {
                String username = requireValue(seedUser.username(), "Benutzername");
                String password = requireValue(seedUser.password(), "Passwort");
                UserRole role = UserRole.fromConfiguration(seedUser.role());
                boolean created = authService.createSeedUserIfAbsent(username, password, role);
                LOG.info("Seed user '{}' {}.", username, created ? "created" : "already exists");
            }
        };
    }

    private List<SeedUser> readSeedUsers(ObjectMapper objectMapper, Path seedUsersFile) {
        if (!Files.isRegularFile(seedUsersFile)) {
            throw new IllegalStateException("Seed-Datei nicht gefunden: " + seedUsersFile);
        }

        try {
            return Arrays.asList(objectMapper.readValue(seedUsersFile.toFile(), SeedUser[].class));
        } catch (Exception exception) {
            throw new IllegalStateException("Seed-Datei konnte nicht gelesen werden: " + seedUsersFile, exception);
        }
    }

    private String requireValue(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(label + " in der Seed-Datei ist erforderlich.");
        }
        return value.trim();
    }

    public record SeedUser(String username, String password, String role) {
    }
}
