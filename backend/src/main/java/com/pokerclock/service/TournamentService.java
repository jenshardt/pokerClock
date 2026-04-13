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
import java.util.stream.Collectors;

@Service
public class TournamentService {

    private static final String STATUS_READY = "READY";
    private static final String STATUS_RUNNING = "RUNNING";
    private static final String STATUS_PAUSED = "PAUSED";
    private static final String STATUS_ENDED = "ENDED";

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
        int entries = request.getParticipants() != null ? request.getParticipants().size() : 0;
        tournament.setEntries(entries);
        tournament.setPlayersLeft(entries);
        tournament.setRebuys(0);
        tournament.setAccumulatedElapsedSeconds(0);
        tournament.setEliminatedPlayers(new ArrayList<>());
        tournament.setCreatedAt(Instant.now());
        tournament.setStatus(STATUS_READY);
        tournament.setResumedAt(null);
        tournament.setStartedAt(null);
        tournament.setRunning(false);

        Tournament saved = repository.save(tournament);
        currentTournamentId = saved.getId();
    }

    public void startTournament() {
        Tournament tournament = getCurrentTournament().orElseThrow(() ->
                new IllegalStateException("Turnier muss zuerst konfiguriert werden."));

        if (STATUS_ENDED.equals(normalizeStatus(tournament.getStatus()))) {
            throw new IllegalStateException("Turnier ist bereits beendet.");
        }

        Instant now = Instant.now();
        if (tournament.getStartedAt() == null) {
            tournament.setStartedAt(now);
        }
        tournament.setResumedAt(now);
        tournament.setStatus(STATUS_RUNNING);
        tournament.setRunning(true);
        repository.save(tournament);
    }

    public void pauseTournament() {
        Tournament tournament = getCurrentTournament().orElseThrow(() ->
                new IllegalStateException("Turnier muss zuerst konfiguriert werden."));

        if (!STATUS_RUNNING.equals(normalizeStatus(tournament.getStatus()))) {
            return;
        }

        accumulateElapsedIfRunning(tournament);
        tournament.setStatus(STATUS_PAUSED);
        tournament.setRunning(false);
        tournament.setResumedAt(null);
        repository.save(tournament);
    }

    public void resumeTournament() {
        Tournament tournament = getCurrentTournament().orElseThrow(() ->
                new IllegalStateException("Turnier muss zuerst konfiguriert werden."));

        String status = normalizeStatus(tournament.getStatus());
        if (STATUS_ENDED.equals(status)) {
            return;
        }

        if (STATUS_READY.equals(status) && tournament.getStartedAt() == null) {
            tournament.setStartedAt(Instant.now());
        }

        tournament.setStatus(STATUS_RUNNING);
        tournament.setRunning(true);
        tournament.setResumedAt(Instant.now());
        repository.save(tournament);
    }

    public void endTournament() {
        Tournament tournament = getCurrentTournament().orElseThrow(() ->
                new IllegalStateException("Turnier muss zuerst konfiguriert werden."));

        if (STATUS_RUNNING.equals(normalizeStatus(tournament.getStatus()))) {
            accumulateElapsedIfRunning(tournament);
        }

        tournament.setStatus(STATUS_ENDED);
        tournament.setRunning(false);
        tournament.setResumedAt(null);
        repository.save(tournament);
    }

    public void seatOpen(String playerName) {
        Tournament tournament = getCurrentTournament().orElseThrow(() ->
                new IllegalStateException("Turnier muss zuerst konfiguriert werden."));

        String target = normalizeName(playerName);
        if (target == null || !tournament.getParticipants().contains(target)) {
            return;
        }

        List<String> eliminated = tournament.getEliminatedPlayers();
        if (!eliminated.contains(target)) {
            eliminated.add(target);
        }

        int nextPlayersLeft = Math.max(0, tournament.getParticipants().size() - eliminated.size());
        tournament.setPlayersLeft(nextPlayersLeft);
        repository.save(tournament);
    }

    public void registerRebuy(String playerName) {
        Tournament tournament = getCurrentTournament().orElseThrow(() ->
                new IllegalStateException("Turnier muss zuerst konfiguriert werden."));

        String target = normalizeName(playerName);
        if (target == null || !tournament.getParticipants().contains(target)) {
            return;
        }

        List<String> eliminated = tournament.getEliminatedPlayers();
        boolean removed = eliminated.remove(target);
        if (!removed) {
            return;
        }

        tournament.setPlayersLeft(Math.max(0, tournament.getParticipants().size() - eliminated.size()));
        tournament.setRebuys(Math.max(0, tournament.getRebuys()) + 1);
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
        String status = normalizeStatus(tournament.getStatus());
        long elapsedSeconds = getElapsedSeconds(tournament, status);

        List<ScheduleItem> schedule = parseSchedule(tournament.getBlindStructure());
        ScheduleState state = resolveScheduleState(schedule, elapsedSeconds, tournament.getBlindDurationSeconds());
        long timeToNextBreakSeconds = computeTimeToNextBreakSeconds(schedule, state);
        int playersLeft = Math.max(0, tournament.getPlayersLeft());
        int entries = Math.max(0, tournament.getEntries());
        int rebuys = Math.max(0, tournament.getRebuys());
        int startingStack = Math.max(0, tournament.getStartingChips());
        long totalChips = (long) (entries + rebuys) * startingStack;
        long averageStack = playersLeft > 0 ? totalChips / playersLeft : 0;
        List<String> eliminatedPlayers = new ArrayList<>(tournament.getEliminatedPlayers());
        List<String> activePlayers = tournament.getParticipants().stream()
            .filter((name) -> !eliminatedPlayers.contains(name))
            .collect(Collectors.toList());

        String nextPhase = state.isBreak
            ? "Pause"
            : (tournament.isRebuyAllowed() ? "Rebuys möglich" : "Keine Rebuys");

        String statusText = mapStatusToText(status);

        return TournamentStatusResponse.builder()
                .tournamentName(tournament.getTournamentName())
                .currentBlind(state.label)
                .currentSmallBlind(state.smallBlind)
                .currentBigBlind(state.bigBlind)
                .currentLevelNumber(state.currentLevelNumber)
                .nextItem(state.nextLabel)
                .status(statusText)
                .remainingSeconds(state.remainingSeconds)
                .elapsedSeconds(elapsedSeconds)
                .timeToNextBreakSeconds(timeToNextBreakSeconds)
                .nextPhase(nextPhase)
                .entries(entries)
                .activePlayers(playersLeft)
                .playersLeft(playersLeft)
                .rebuys(rebuys)
                .startingStack(startingStack)
                .totalChips(totalChips)
                .averageStack(averageStack)
                .activePlayerNames(activePlayers)
                .eliminatedPlayerNames(eliminatedPlayers)
                .running(STATUS_RUNNING.equals(status))
                .message(statusText)
                .build();
    }

    private String normalizeName(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        return trimmed.isEmpty() ? null : trimmed;
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
                Integer smallBlind = null;
                Integer bigBlind = null;
                String[] blindParts = blind.split("/");
                if (blindParts.length >= 2) {
                    smallBlind = parsePositiveInt(blindParts[0], 25);
                    bigBlind = parsePositiveInt(blindParts[1], Math.max(50, smallBlind * 2));
                }
                String label = (smallBlind != null && bigBlind != null)
                        ? smallBlind + "/" + bigBlind
                        : blind;
                items.add(new ScheduleItem(label, durationMinutes * 60L, false, smallBlind, bigBlind));
            } else if (token.startsWith("B:")) {
                String[] parts = token.split(":");
                if (parts.length < 2) {
                    continue;
                }
                int durationMinutes = parsePositiveInt(parts[1], 10);
                items.add(new ScheduleItem("Break", durationMinutes * 60L, true, null, null));
            } else if (token.contains("/")) {
                String[] blindParts = token.split("/");
                Integer smallBlind = parsePositiveInt(blindParts[0], 25);
                Integer bigBlind = blindParts.length > 1
                        ? parsePositiveInt(blindParts[1], Math.max(50, smallBlind * 2))
                        : Math.max(50, smallBlind * 2);
                String label = smallBlind + "/" + bigBlind;
                items.add(new ScheduleItem(label, Math.max(1, 20 * 60L), false, smallBlind, bigBlind));
            }
        }

        return items;
    }

    private ScheduleState resolveScheduleState(List<ScheduleItem> schedule, long elapsedSeconds, long fallbackDurationSeconds) {
        if (schedule.isEmpty()) {
            long remaining = Math.max(0, fallbackDurationSeconds - elapsedSeconds);
            return new ScheduleState("—", remaining, false, null, null, null, "—", 0);
        }

        if (elapsedSeconds <= 0) {
            ScheduleItem first = schedule.get(0);
            return buildStateForIndex(schedule, 0, first.durationSeconds);
        }

        long consumed = 0;
        for (int index = 0; index < schedule.size(); index += 1) {
            ScheduleItem item = schedule.get(index);
            long end = consumed + item.durationSeconds;
            if (elapsedSeconds < end) {
                return buildStateForIndex(schedule, index, end - elapsedSeconds);
            }
            consumed = end;
        }

        return buildStateForIndex(schedule, schedule.size() - 1, 0);
    }

    private ScheduleState buildStateForIndex(List<ScheduleItem> schedule, int index, long remainingSeconds) {
        ScheduleItem current = schedule.get(index);
        String nextLabel = index + 1 < schedule.size() ? schedule.get(index + 1).label : "—";

        Integer currentLevelNumber = null;
        if (!current.breakItem) {
            int levelCounter = 0;
            for (int i = 0; i <= index; i += 1) {
                if (!schedule.get(i).breakItem) {
                    levelCounter += 1;
                }
            }
            currentLevelNumber = levelCounter;
        }

        return new ScheduleState(
                current.label,
                Math.max(0, remainingSeconds),
                current.breakItem,
                current.smallBlind,
                current.bigBlind,
                currentLevelNumber,
                nextLabel,
                index
        );
    }

    private long computeTimeToNextBreakSeconds(List<ScheduleItem> schedule, ScheduleState state) {
        if (schedule.isEmpty() || state.currentIndex < 0 || state.currentIndex >= schedule.size()) {
            return -1;
        }

        if (state.isBreak) {
            return 0;
        }

        long seconds = state.remainingSeconds;
        for (int index = state.currentIndex + 1; index < schedule.size(); index += 1) {
            ScheduleItem item = schedule.get(index);
            if (item.breakItem) {
                return seconds;
            }
            seconds += item.durationSeconds;
        }

        return -1;
    }

    private long getElapsedSeconds(Tournament tournament, String status) {
        long elapsed = Math.max(0, tournament.getAccumulatedElapsedSeconds());
        if (STATUS_RUNNING.equals(status) && tournament.getResumedAt() != null) {
            elapsed += Math.max(0, ChronoUnit.SECONDS.between(tournament.getResumedAt(), Instant.now()));
        }
        return elapsed;
    }

    private void accumulateElapsedIfRunning(Tournament tournament) {
        if (tournament.getResumedAt() == null) {
            return;
        }
        long delta = Math.max(0, ChronoUnit.SECONDS.between(tournament.getResumedAt(), Instant.now()));
        tournament.setAccumulatedElapsedSeconds(Math.max(0, tournament.getAccumulatedElapsedSeconds()) + delta);
    }

    private String normalizeStatus(String status) {
        if (STATUS_RUNNING.equals(status) || STATUS_PAUSED.equals(status) || STATUS_ENDED.equals(status) || STATUS_READY.equals(status)) {
            return status;
        }
        return STATUS_READY;
    }

    private String mapStatusToText(String status) {
        return switch (status) {
            case STATUS_RUNNING -> "Turnier läuft";
            case STATUS_PAUSED -> "Turnier pausiert";
            case STATUS_ENDED -> "Turnier beendet";
            default -> "Turnier bereit";
        };
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
        private final Integer smallBlind;
        private final Integer bigBlind;

        private ScheduleItem(String label, long durationSeconds, boolean breakItem, Integer smallBlind, Integer bigBlind) {
            this.label = label;
            this.durationSeconds = durationSeconds;
            this.breakItem = breakItem;
            this.smallBlind = smallBlind;
            this.bigBlind = bigBlind;
        }
    }

    private static class ScheduleState {
        private final String label;
        private final long remainingSeconds;
        private final boolean isBreak;
        private final Integer smallBlind;
        private final Integer bigBlind;
        private final Integer currentLevelNumber;
        private final String nextLabel;
        private final int currentIndex;

        private ScheduleState(
                String label,
                long remainingSeconds,
                boolean isBreak,
                Integer smallBlind,
                Integer bigBlind,
                Integer currentLevelNumber,
                String nextLabel,
                int currentIndex
        ) {
            this.label = label;
            this.remainingSeconds = remainingSeconds;
            this.isBreak = isBreak;
            this.smallBlind = smallBlind;
            this.bigBlind = bigBlind;
            this.currentLevelNumber = currentLevelNumber;
            this.nextLabel = nextLabel;
            this.currentIndex = currentIndex;
        }
    }
}
