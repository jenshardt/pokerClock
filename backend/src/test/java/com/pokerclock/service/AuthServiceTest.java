package com.pokerclock.service;

import com.pokerclock.model.AppUser;
import com.pokerclock.model.UserRole;
import com.pokerclock.repository.AppUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import static java.time.temporal.ChronoUnit.HOURS;
import static java.time.temporal.ChronoUnit.MINUTES;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AppUserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private AuthService authService;
    private ConcurrentHashMap<String, AuthService.SessionUser> sessions;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() throws Exception {
        authService = new AuthService(userRepository, passwordEncoder);
        // Direkter Zugriff auf die interne Map, um Testtoken mit beliebigem Zeitstempel einzuschleusen
        Field field = AuthService.class.getDeclaredField("sessions");
        field.setAccessible(true);
        sessions = (ConcurrentHashMap<String, AuthService.SessionUser>) field.get(authService);
    }

    // --- resolveSession: gültige Session ---

    @Test
    void resolveSessionShouldReturnSessionWhenWithinTtl() {
        String token = injectSession("alice", UserRole.ADMIN, Instant.now().minus(7, HOURS));

        assertThat(authService.resolveSession(token)).isPresent();
    }

    @Test
    void resolveSessionShouldReturnSessionJustBeforeTtlExpiry() {
        String token = injectSession("alice", UserRole.ADMIN, Instant.now().minus(7, HOURS).minus(59, MINUTES));

        assertThat(authService.resolveSession(token)).isPresent();
    }

    // --- resolveSession: abgelaufene Session ---

    @Test
    void resolveSessionShouldReturnEmptyWhenSessionIsExpired() {
        String token = injectSession("alice", UserRole.ADMIN, Instant.now().minus(9, HOURS));

        assertThat(authService.resolveSession(token)).isEmpty();
    }

    @Test
    void resolveSessionShouldRemoveExpiredTokenFromMap() {
        String token = injectSession("alice", UserRole.ADMIN, Instant.now().minus(9, HOURS));

        authService.resolveSession(token);

        assertThat(sessions).doesNotContainKey(token);
    }

    @Test
    void resolveSessionShouldReturnEmptyForExpiredTokenOnRepeatedCall() {
        String token = injectSession("alice", UserRole.ADMIN, Instant.now().minus(9, HOURS));

        authService.resolveSession(token); // entfernt den Token
        assertThat(authService.resolveSession(token)).isEmpty(); // zweiter Aufruf: map-Treffer fehlt
    }

    // --- purgeExpiredSessions ---

    @Test
    void purgeExpiredSessionsShouldRemoveOnlyExpiredEntries() {
        String expired = injectSession("old", UserRole.ADMIN, Instant.now().minus(9, HOURS));
        String valid = injectSession("new", UserRole.ADMIN, Instant.now().minus(1, HOURS));

        authService.purgeExpiredSessions();

        assertThat(sessions).doesNotContainKey(expired);
        assertThat(sessions).containsKey(valid);
    }

    @Test
    void purgeExpiredSessionsShouldKeepAllSessionsWhenNoneAreExpired() {
        String token1 = injectSession("u1", UserRole.ADMIN, Instant.now().minus(1, HOURS));
        String token2 = injectSession("u2", UserRole.FLOORMAN, Instant.now().minus(3, HOURS));

        authService.purgeExpiredSessions();

        assertThat(sessions).containsKey(token1);
        assertThat(sessions).containsKey(token2);
    }

    @Test
    void purgeExpiredSessionsShouldRemoveAllSessionsWhenAllAreExpired() {
        injectSession("u1", UserRole.ADMIN, Instant.now().minus(9, HOURS));
        injectSession("u2", UserRole.FLOORMAN, Instant.now().minus(10, HOURS));

        authService.purgeExpiredSessions();

        assertThat(sessions).isEmpty();
    }

    // --- authenticate: neu ausgestellte Session hat korrekten Zeitstempel ---

    @Test
    void authenticateShouldStoreSessionWithCurrentTimestamp() {
        AppUser user = buildUser("bob", "hash", UserRole.ADMIN);
        when(userRepository.findByUsernameIgnoreCase(anyString())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);

        Instant before = Instant.now();
        authService.authenticate("bob", "secret");
        Instant after = Instant.now();

        assertThat(sessions).hasSize(1);
        AuthService.SessionUser stored = sessions.values().iterator().next();
        assertThat(stored.authenticatedAt()).isBetween(before, after);
    }

    @Test
    void createSeedUserIfAbsentDoesNotOverwriteExistingUser() {
        AppUser existingUser = buildUser("admin", "existing-hash", UserRole.ADMIN);
        when(userRepository.findByUsernameIgnoreCase("admin")).thenReturn(Optional.of(existingUser));

        boolean created = authService.createSeedUserIfAbsent("admin", "new-password", UserRole.FLOORMAN);

        assertThat(created).isFalse();
        verify(passwordEncoder, never()).encode(anyString());
        verify(userRepository, never()).save(existingUser);
    }

    // --- Hilfsmethoden ---

    private String injectSession(String username, UserRole role, Instant authenticatedAt) {
        String token = java.util.UUID.randomUUID().toString();
        sessions.put(token, new AuthService.SessionUser(username, role, authenticatedAt));
        return token;
    }

    private AppUser buildUser(String username, String passwordHash, UserRole role) {
        AppUser user = new AppUser();
        user.setUsername(username);
        user.setPasswordHash(passwordHash);
        user.setRole(role);
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());
        return user;
    }
}
