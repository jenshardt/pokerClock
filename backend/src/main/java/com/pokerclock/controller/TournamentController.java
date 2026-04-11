package com.pokerclock.controller;

import com.pokerclock.api.TournamentSetupRequest;
import com.pokerclock.api.TournamentStatusResponse;
import com.pokerclock.service.TournamentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class TournamentController {

    private final TournamentService tournamentService;

    public TournamentController(TournamentService tournamentService) {
        this.tournamentService = tournamentService;
    }

    @GetMapping("/status")
    public ResponseEntity<TournamentStatusResponse> getStatus() {
        return ResponseEntity.ok(tournamentService.getStatus());
    }

    @PostMapping("/setup")
    public ResponseEntity<Void> setupTournament(@RequestBody TournamentSetupRequest request) {
        tournamentService.setupTournament(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/start")
    public ResponseEntity<Void> startTournament() {
        tournamentService.startTournament();
        return ResponseEntity.ok().build();
    }
}
