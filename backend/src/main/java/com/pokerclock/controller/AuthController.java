package com.pokerclock.controller;

import com.pokerclock.api.CurrentUserResponse;
import com.pokerclock.api.LoginRequest;
import com.pokerclock.api.LoginResponse;
import com.pokerclock.service.AuthService;
import com.pokerclock.service.LoginRateLimiterService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String AUTH_HEADER = "X-Auth-Token";

    private final AuthService authService;
    private final LoginRateLimiterService rateLimiter;

    public AuthController(AuthService authService, LoginRateLimiterService rateLimiter) {
        this.authService = authService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request,
                                               HttpServletRequest httpRequest) {
        String ip = resolveClientIp(httpRequest);
        if (!rateLimiter.tryConsume(ip)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header("Retry-After", String.valueOf(LoginRateLimiterService.REFILL_PERIOD.getSeconds()))
                    .build();
        }
        return authService.authenticate(request.getUsername(), request.getPassword())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @GetMapping("/me")
    public ResponseEntity<CurrentUserResponse> currentUser(@RequestHeader(AUTH_HEADER) String token) {
        return authService.getCurrentUser(token)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(value = AUTH_HEADER, required = false) String token) {
        authService.logout(token);
        return ResponseEntity.ok().build();
    }

    /**
     * Liest die Client-IP aus dem {@code X-Forwarded-For}-Header (gesetzt von nginx)
     * oder fällt auf die direkte Remote-Adresse zurück.
     */
    static String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // X-Forwarded-For kann mehrere IPs enthalten: "client, proxy1, proxy2"
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
