package com.pokerclock.service;

import com.pokerclock.api.TournamentSetupRequest;
import com.pokerclock.api.TournamentStatusResponse;
import com.pokerclock.model.Tournament;
import com.pokerclock.repository.TournamentRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
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
        tournament.setParticipants(new ArrayList<>(request.getParticipants()));
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

        List<ScheduleItem> schedule = parseSchedule(tournament.getBlindStructure());
        ScheduleState state = resolveScheduleState(schedule, elapsedSeconds, tournament.getBlindDurationSeconds());
        String nextPhase = state.isBreak
            ? "Pause"
            : (tournament.isRebuyAllowed() ? "Rebuys möglich" : "Keine Rebuys");

        return TournamentStatusResponse.builder()
                .tournamentName(tournament.getTournamentName())
            .currentBlind(state.label)
            .remainingSeconds(state.remainingSeconds)
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

    private List<ScheduleItem> parseSchedule(String blindStructure) {
        List<ScheduleItem> items = new ArrayList<>();
        if (blindStructure == null || blindStructure.isBlank()) {
            return items;
        }

        String[] tokens = blindStructure.split(",");
        for (String rawToken : tokens) {
            String token = rawToken.trim();
            if (token.startsWith("L:")) {
                String[] parts = token.split(":");
                if (parts.length < 3) {
                    continue;
                }
                String blind = parts[1];
                int durationMinutes = parsePositiveInt(parts[2], 20);
                items.add(new ScheduleItem(blind, durationMinutes * 60L, false));
            } else if (token.startsWith("B:")) {
                String[] parts = token.split(":");
                if (parts.length < 2) {
                    continue;
                }
                int durationMinutes = parsePositiveInt(parts[1], 10);
                items.add(new ScheduleItem("Break", durationMinutes * 60L, true));
            } else if (token.contains("/")) {
                items.add(new ScheduleItem(token, Math.max(1, 20 * 60L), false));
            }
        }

        return items;
    }

    private ScheduleState resolveScheduleState(List<ScheduleItem> schedule, long elapsedSeconds, long fallbackDurationSeconds) {
        if (schedule.isEmpty()) {
            long remaining = Math.max(0, fallbackDurationSeconds - elapsedSeconds);
            return new ScheduleState("—", remaining, false);
        }

        if (elapsedSeconds <= 0) {
            ScheduleItem first = schedule.get(0);
            return new ScheduleState(first.label, first.durationSeconds, first.breakItem);
        }

        long consumed = 0;
        for (ScheduleItem item : schedule) {
            long end = consumed + item.durationSeconds;
            if (elapsedSeconds < end) {
                return new ScheduleState(item.label, end - elapsedSeconds, item.breakItem);
            }
            consumed = end;
        }

        ScheduleItem last = schedule.get(schedule.size() - 1);
        return new ScheduleState(last.label, 0, last.breakItem);
    }

    private int parsePositiveInt(String value, int fallback) {
        try {
            int parsed = Integer.parseInt(value.trim());
            return parsed > 0 ? parsed : fallback;
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private static class ScheduleItem {
        private final String label;
        private final long durationSeconds;
        private final boolean breakItem;

        private ScheduleItem(String label, long durationSeconds, boolean breakItem) {
            this.label = label;
            this.durationSeconds = durationSeconds;
            this.breakItem = breakItem;
        }
    }

    private static class ScheduleState {
        private final String label;
        private final long remainingSeconds;
        private final boolean isBreak;

        private ScheduleState(String label, long remainingSeconds, boolean isBreak) {
            this.label = label;
            this.remainingSeconds = remainingSeconds;
            this.isBreak = isBreak;
        }
    }
}
