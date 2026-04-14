package com.pokerclock.controller;

import com.pokerclock.api.PlayerActionRequest;
import com.pokerclock.api.TournamentResultSaveRequest;
import com.pokerclock.api.TournamentResultSaveResponse;
import com.pokerclock.api.TournamentSetupRequest;
import com.pokerclock.api.TournamentStatusResponse;
import com.pokerclock.service.TournamentResultArchiveService;
import com.pokerclock.service.TournamentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class TournamentController {

    private final TournamentService tournamentService;
    private final TournamentResultArchiveService resultArchiveService;

    public TournamentController(TournamentService tournamentService, TournamentResultArchiveService resultArchiveService) {
        this.tournamentService = tournamentService;
        this.resultArchiveService = resultArchiveService;
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

    @PostMapping("/pause")
    public ResponseEntity<Void> pauseTournament() {
        tournamentService.pauseTournament();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/resume")
    public ResponseEntity<Void> resumeTournament() {
        tournamentService.resumeTournament();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/end")
    public ResponseEntity<Void> endTournament() {
        tournamentService.endTournament();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/results")
    public ResponseEntity<TournamentResultSaveResponse> saveTournamentResult(@RequestBody TournamentResultSaveRequest request) {
        return ResponseEntity.ok(resultArchiveService.saveResult(request));
    }

    @PostMapping("/seat-open")
    public ResponseEntity<Void> seatOpen(@RequestBody(required = false) PlayerActionRequest request) {
        tournamentService.seatOpen(request != null ? request.getPlayerName() : null);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/rebuy")
    public ResponseEntity<Void> rebuy(@RequestBody(required = false) PlayerActionRequest request) {
        tournamentService.registerRebuy(request != null ? request.getPlayerName() : null);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/table/balance")
    public ResponseEntity<Void> balanceTables() {
        tournamentService.balanceTables();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/table/final-table")
    public ResponseEntity<Void> createFinalTable() {
        tournamentService.createFinalTable();
        return ResponseEntity.ok().build();
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<String> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getMessage());
    }
}
