package com.pokerclock.controller;

import com.pokerclock.api.CreateTournamentResponse;
import com.pokerclock.api.RegistrationTemplateRequest;
import com.pokerclock.api.RegistrationTemplateResponse;
import com.pokerclock.config.RequireRoles;
import com.pokerclock.model.UserRole;
import com.pokerclock.service.RegistrationTemplateService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/registration/templates")
public class RegistrationController {

    private final RegistrationTemplateService registrationService;

    public RegistrationController(RegistrationTemplateService registrationService) {
        this.registrationService = registrationService;
    }

    @PostMapping
    @RequireRoles(UserRole.ADMIN)
    public ResponseEntity<RegistrationTemplateResponse> createTemplate(@RequestBody RegistrationTemplateRequest request) {
        return ResponseEntity.ok(registrationService.save(request));
    }

    @GetMapping("/latest")
    @RequireRoles(UserRole.ADMIN)
    public ResponseEntity<RegistrationTemplateResponse> getLatestTemplate() {
        return registrationService.getLatest()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/{id}/export")
    @RequireRoles(UserRole.ADMIN)
    public ResponseEntity<RegistrationTemplateResponse> exportTemplate(@PathVariable Long id) {
        return ResponseEntity.ok(registrationService.exportById(id));
    }

    @PostMapping("/import")
    @RequireRoles(UserRole.ADMIN)
    public ResponseEntity<RegistrationTemplateResponse> importTemplate(@RequestBody RegistrationTemplateRequest request) {
        return ResponseEntity.ok(registrationService.importTemplate(request));
    }

    @PostMapping("/{id}/create-tournament")
    @RequireRoles(UserRole.ADMIN)
    public ResponseEntity<CreateTournamentResponse> createTournament(@PathVariable Long id) {
        return ResponseEntity.ok(registrationService.createTournament(id));
    }
}