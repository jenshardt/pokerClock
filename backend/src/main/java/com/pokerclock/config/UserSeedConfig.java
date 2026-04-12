package com.pokerclock.config;

import com.pokerclock.service.AuthService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class UserSeedConfig {

    @Bean
    public CommandLineRunner seedDefaultUser(AuthService authService) {
        return args -> authService.ensureSeedUser("Jens", "allInCologne", "ADMIN");
    }
}
