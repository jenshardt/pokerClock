package com.pokerclock.controller;

import com.pokerclock.api.CreateTournamentResponse;
import com.pokerclock.api.RegistrationTemplateRequest;
import com.pokerclock.api.RegistrationTemplateResponse;
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
    public ResponseEntity<RegistrationTemplateResponse> createTemplate(@RequestBody RegistrationTemplateRequest request) {
        return ResponseEntity.ok(registrationService.save(request));
    }

    @GetMapping("/latest")
    public ResponseEntity<RegistrationTemplateResponse> getLatestTemplate() {
        return registrationService.getLatest()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/{id}/export")
    public ResponseEntity<RegistrationTemplateResponse> exportTemplate(@PathVariable Long id) {
        return ResponseEntity.ok(registrationService.exportById(id));
    }

    @PostMapping("/import")
    public ResponseEntity<RegistrationTemplateResponse> importTemplate(@RequestBody RegistrationTemplateRequest request) {
        return ResponseEntity.ok(registrationService.importTemplate(request));
    }

    @PostMapping("/{id}/create-tournament")
    public ResponseEntity<CreateTournamentResponse> createTournament(@PathVariable Long id) {
        return ResponseEntity.ok(registrationService.createTournament(id));
    }
}