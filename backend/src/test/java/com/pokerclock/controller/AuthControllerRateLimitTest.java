package com.pokerclock.controller;

import com.pokerclock.service.AuthService;
import com.pokerclock.service.LoginRateLimiterService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerRateLimitTest {

    @Mock
    private AuthService authService;

    // Echter Service – kein Mock, damit der Bucket-Zustand zwischen den Requests erhalten bleibt
    private LoginRateLimiterService rateLimiter;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        rateLimiter = new LoginRateLimiterService();
        AuthController controller = new AuthController(authService, rateLimiter);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();

        // Standardmäßig schlägt die Authentifizierung fehl;
        // lenient: nicht alle Tests verwenden diesen Stub
        lenient().when(authService.authenticate(anyString(), anyString())).thenReturn(Optional.empty());
    }

    @Test
    void loginShouldReturn401ForInvalidCredentials() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("user", "wrong")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginShouldReturn429AfterExceedingLimit() throws Exception {
        // Die ersten MAX_ATTEMPTS Versuche dürfen durchkommen (Antwort 401, nicht 429)
        for (int i = 0; i < LoginRateLimiterService.MAX_ATTEMPTS; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(loginBody("user", "wrong")))
                    .andExpect(status().isUnauthorized());
        }

        // Der nächste Versuch überschreitet das Limit
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("user", "wrong")))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void retryAfterHeaderShouldBePresentWhenLimitExceeded() throws Exception {
        for (int i = 0; i < LoginRateLimiterService.MAX_ATTEMPTS; i++) {
            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginBody("user", "wrong")));
        }

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("user", "wrong")))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After",
                        String.valueOf(LoginRateLimiterService.REFILL_PERIOD.getSeconds())));
    }

    @Test
    void rateLimitShouldBlockEvenValidCredentialsWhenLimitExceeded() throws Exception {
        when(authService.authenticate(anyString(), anyString()))
                .thenReturn(Optional.of(new com.pokerclock.api.LoginResponse("tok", "user", "ADMIN")));

        for (int i = 0; i < LoginRateLimiterService.MAX_ATTEMPTS; i++) {
            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginBody("user", "correct")));
        }

        // Auch mit gültigen Credentials: 429 nach Limit-Überschreitung
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("user", "correct")))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void differentIpsShouldHaveSeparateLimits() throws Exception {
        // IP A läuft auf Limit
        for (int i = 0; i < LoginRateLimiterService.MAX_ATTEMPTS; i++) {
            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginBody("user", "wrong"))
                    .header("X-Forwarded-For", "10.0.0.1"));
        }
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("user", "wrong"))
                        .header("X-Forwarded-For", "10.0.0.1"))
                .andExpect(status().isTooManyRequests());

        // IP B hat ein eigenes Budget und darf noch Requests senden
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("user", "wrong"))
                        .header("X-Forwarded-For", "10.0.0.2"))
                .andExpect(status().isUnauthorized()); // 401, nicht 429
    }

    @Test
    void firstIpInXForwardedForShouldBeUsedAsClientIp() throws Exception {
        // Sicherstellen, dass nur die erste IP aus "client, proxy" gewertet wird
        for (int i = 0; i < LoginRateLimiterService.MAX_ATTEMPTS; i++) {
            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginBody("user", "wrong"))
                    .header("X-Forwarded-For", "10.0.0.3, 192.168.1.1"));
        }
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("user", "wrong"))
                        .header("X-Forwarded-For", "10.0.0.3, 192.168.1.1"))
                .andExpect(status().isTooManyRequests());

        // Die Proxy-IP (192.168.1.1) hat kein eigenes Limit verbraucht
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("user", "wrong"))
                        .header("X-Forwarded-For", "192.168.1.1"))
                .andExpect(status().isUnauthorized());
    }

    // --- resolveClientIp Unit-Tests ---

    @Test
    void resolveClientIpShouldUseXForwardedForHeader() {
        var request = new org.springframework.mock.web.MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "203.0.113.5");

        String ip = AuthController.resolveClientIp(request);

        org.assertj.core.api.Assertions.assertThat(ip).isEqualTo("203.0.113.5");
    }

    @Test
    void resolveClientIpShouldUseFirstEntryOfXForwardedFor() {
        var request = new org.springframework.mock.web.MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "203.0.113.5, 10.1.1.1");

        String ip = AuthController.resolveClientIp(request);

        org.assertj.core.api.Assertions.assertThat(ip).isEqualTo("203.0.113.5");
    }

    @Test
    void resolveClientIpShouldFallBackToRemoteAddr() {
        var request = new org.springframework.mock.web.MockHttpServletRequest();
        request.setRemoteAddr("192.168.0.10");

        String ip = AuthController.resolveClientIp(request);

        org.assertj.core.api.Assertions.assertThat(ip).isEqualTo("192.168.0.10");
    }

    // --- Hilfsmethode ---

    private String loginBody(String username, String password) {
        return "{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}";
    }
}
