package com.pokerclock.service;

import com.pokerclock.api.TournamentSetupRequest;
import com.pokerclock.api.TournamentStatusResponse;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class TournamentService {

    private final AtomicBoolean running = new AtomicBoolean(false);
    private TournamentSetupRequest currentSetup;
    private Instant stageStartedAt;

    public void setupTournament(TournamentSetupRequest request) {
        currentSetup = request;
        running.set(false);
        stageStartedAt = Instant.now();
    }

    public void startTournament() {
        if (currentSetup == null) {
            throw new IllegalStateException("Turnier muss zuerst konfiguriert werden.");
        }
        running.set(true);
        stageStartedAt = Instant.now();
    }

    public TournamentStatusResponse getStatus() {
        if (currentSetup == null) {
            return TournamentStatusResponse.builder()
                    .message("Kein Turnier konfiguriert")
                    .build();
        }

        long elapsedSeconds = 0;
        if (running.get() && stageStartedAt != null) {
            elapsedSeconds = ChronoUnit.SECONDS.between(stageStartedAt, Instant.now());
        }

        long remainingSeconds = Math.max(0, currentSetup.getBlindDurationSeconds() - elapsedSeconds);
        String currentBlind = currentSetup.getBlindStructure();
        String nextPhase = currentSetup.isRebuyAllowed() ? "Rebuys möglich" : "Keine Rebuys";

        return TournamentStatusResponse.builder()
                .tournamentName(currentSetup.getTournamentName())
                .currentBlind(currentBlind)
                .remainingSeconds(remainingSeconds)
                .nextPhase(nextPhase)
                .activePlayers(currentSetup.getParticipants().size())
                .running(running.get())
                .message(running.get() ? "Turnier läuft" : "Turnier bereit"
                )
                .build();
    }
}
