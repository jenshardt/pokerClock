package com.pokerclock.service;

import com.pokerclock.api.CurrentUserResponse;
import com.pokerclock.api.LoginResponse;
import com.pokerclock.model.AppUser;
import com.pokerclock.model.UserRole;
import com.pokerclock.repository.AppUserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import org.springframework.scheduling.annotation.Scheduled;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
public class AuthService {

    static final Duration SESSION_TTL = Duration.ofHours(8);

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ConcurrentHashMap<String, SessionUser> sessions = new ConcurrentHashMap<>();

    public AuthService(AppUserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public Optional<LoginResponse> authenticate(String username, String password) {
        return userRepository.findByUsernameIgnoreCase(username == null ? "" : username.trim())
                .filter(user -> passwordEncoder.matches(password == null ? "" : password, user.getPasswordHash()))
                .map(user -> {
                    String token = UUID.randomUUID().toString();
                    sessions.put(token, new SessionUser(user.getUsername(), user.getRole(), Instant.now()));
                    return new LoginResponse(token, user.getUsername(), user.getRole().name());
                });
    }

    public Optional<CurrentUserResponse> getCurrentUser(String token) {
        return resolveSession(token).map(session -> new CurrentUserResponse(session.username(), session.role().name()));
    }

    public Optional<SessionUser> resolveSession(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }

        SessionUser session = sessions.get(token);
        if (session == null) {
            return Optional.empty();
        }
        if (Duration.between(session.authenticatedAt(), Instant.now()).compareTo(SESSION_TTL) > 0) {
            sessions.remove(token);
            return Optional.empty();
        }
        return Optional.of(session);
    }

    @Scheduled(fixedRate = 30, timeUnit = TimeUnit.MINUTES)
    void purgeExpiredSessions() {
        Instant cutoff = Instant.now().minus(SESSION_TTL);
        sessions.entrySet().removeIf(e -> e.getValue().authenticatedAt().isBefore(cutoff));
    }

    public void logout(String token) {
        if (token != null && !token.isBlank()) {
            sessions.remove(token);
        }
    }

    public boolean createSeedUserIfAbsent(String username, String rawPassword, UserRole role) {
        if (userRepository.findByUsernameIgnoreCase(username).isPresent()) {
            return false;
        }

        AppUser user = new AppUser();
        Instant now = Instant.now();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setRole(role);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        userRepository.save(user);
        return true;
    }

    public record SessionUser(String username, UserRole role, Instant authenticatedAt) {
    }
}
