package com.pokerclock.service;

import com.pokerclock.api.TournamentSetupRequest;
import com.pokerclock.api.TournamentStatusResponse;
import com.pokerclock.model.Tournament;
import com.pokerclock.repository.TournamentRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Service
public class TournamentService {

    private final TournamentRepository repository;
    private Long currentTournamentId;

    public TournamentService(TournamentRepository repository) {
        this.repository = repository;
    }

    public void setupTournament(TournamentSetupRequest request) {
        Tournament tournament = new Tournament();
        tournament.setTournamentName(request.getTournamentName());
        tournament.setParticipants(request.getParticipants());
        tournament.setTableCount(request.getTableCount());
        tournament.setSeatsPerTable(request.getSeatsPerTable());
        tournament.setStartingChips(request.getStartingChips());
        tournament.setBlindStructure(request.getBlindStructure());
        tournament.setBlindDurationSeconds(request.getBlindDurationSeconds());
        tournament.setRebuyAllowed(request.isRebuyAllowed());
        tournament.setCreatedAt(Instant.now());
        tournament.setRunning(false);

        Tournament saved = repository.save(tournament);
        currentTournamentId = saved.getId();
    }

    public void startTournament() {
        Tournament tournament = getCurrentTournament().orElseThrow(() ->
                new IllegalStateException("Turnier muss zuerst konfiguriert werden."));

        tournament.setRunning(true);
        tournament.setStartedAt(Instant.now());
        repository.save(tournament);
    }

    public TournamentStatusResponse getStatus() {
        Optional<Tournament> maybeTournament = getCurrentTournament();
        if (maybeTournament.isEmpty()) {
            return TournamentStatusResponse.builder()
                    .message("Kein Turnier konfiguriert")
                    .build();
        }

        Tournament tournament = maybeTournament.get();
        long elapsedSeconds = 0;
        if (tournament.isRunning() && tournament.getStartedAt() != null) {
            elapsedSeconds = ChronoUnit.SECONDS.between(tournament.getStartedAt(), Instant.now());
        }

        long remainingSeconds = Math.max(0, tournament.getBlindDurationSeconds() - elapsedSeconds);
        String nextPhase = tournament.isRebuyAllowed() ? "Rebuys möglich" : "Keine Rebuys";

        return TournamentStatusResponse.builder()
                .tournamentName(tournament.getTournamentName())
                .currentBlind(tournament.getBlindStructure())
                .remainingSeconds(remainingSeconds)
                .nextPhase(nextPhase)
                .activePlayers(tournament.getParticipants().size())
                .running(tournament.isRunning())
                .message(tournament.isRunning() ? "Turnier läuft" : "Turnier bereit")
                .build();
    }

    private Optional<Tournament> getCurrentTournament() {
        if (currentTournamentId != null) {
            return repository.findById(currentTournamentId);
        }
        return repository.findTopByOrderByCreatedAtDesc();
    }
}
