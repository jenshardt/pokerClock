package com.pokerclock.controller;

import com.pokerclock.api.CurrentUserResponse;
import com.pokerclock.api.LoginRequest;
import com.pokerclock.api.LoginResponse;
import com.pokerclock.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String AUTH_HEADER = "X-Auth-Token";

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
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
}
