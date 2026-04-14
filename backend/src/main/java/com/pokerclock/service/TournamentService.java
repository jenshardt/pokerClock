package com.pokerclock.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pokerclock.api.TournamentSetupRequest;
import com.pokerclock.api.TournamentStatusResponse;
import com.pokerclock.model.Tournament;
import com.pokerclock.repository.TournamentRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
public class TournamentService {

    private static final String STATUS_READY = "READY";
    private static final String STATUS_RUNNING = "RUNNING";
    private static final String STATUS_PAUSED = "PAUSED";
    private static final String STATUS_ENDED = "ENDED";
    private static final int BALANCE_MIN_DIFFERENCE = 2;

    private static final TypeReference<List<TableState>> TABLE_STATE_TYPE = new TypeReference<>() {
    };

    private final TournamentRepository repository;
    private final ObjectMapper objectMapper = new ObjectMapper();
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
        tournament.setHasNeutralDealer(request.isHasNeutralDealer());
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
        persistTableDistribution(tournament, createInitialDistribution(
            tournament.getParticipants(),
            tournament.getTableCount(),
            tournament.isHasNeutralDealer()
        ));

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

    public void balanceTables() {
        Tournament tournament = getCurrentTournament().orElseThrow(() ->
                new IllegalStateException("Turnier muss zuerst konfiguriert werden."));

        ensurePaused(tournament);

        List<TableState> tables = getTableDistribution(tournament);
        if (tables.size() < 2) {
            return;
        }

        Set<String> activeSet = getActivePlayerSet(tournament);
        List<Integer> activeTableIndexes = new ArrayList<>();
        for (int i = 0; i < tables.size(); i += 1) {
            if (countActivePlayers(tables.get(i), activeSet) > 0) {
                activeTableIndexes.add(i);
            }
        }

        if (activeTableIndexes.size() < 2) {
            return;
        }

        int sourceIdx = activeTableIndexes.stream()
                .max(Comparator.comparingInt(idx -> countActivePlayers(tables.get(idx), activeSet)))
                .orElse(-1);

        int targetIdx = activeTableIndexes.stream()
                .min(Comparator.comparingInt(idx -> countActivePlayers(tables.get(idx), activeSet)))
                .orElse(-1);

        if (sourceIdx < 0 || targetIdx < 0 || sourceIdx == targetIdx) {
            return;
        }

        TableState source = tables.get(sourceIdx);
        TableState target = tables.get(targetIdx);
        int sourceActiveCount = countActivePlayers(source, activeSet);
        int targetActiveCount = countActivePlayers(target, activeSet);
        if (sourceActiveCount - targetActiveCount < BALANCE_MIN_DIFFERENCE) {
            return;
        }

        List<String> sourceActivePlayers = source.players.stream()
                .filter(activeSet::contains)
                .toList();
        if (sourceActivePlayers.isEmpty()) {
            return;
        }

        String movedPlayer = sourceActivePlayers.get(sourceActivePlayers.size() - 1);
        source.players.removeIf(name -> name.equals(movedPlayer));

        int insertIndex = target.players.size();
        if (target.smallBlind != null) {
            int sbIndex = target.players.indexOf(target.smallBlind);
            if (sbIndex >= 0) {
                insertIndex = Math.min(sbIndex + 1, target.players.size());
            }
        }
        target.players.add(insertIndex, movedPlayer);

        assignRoles(source);
        assignRoles(target);
        persistTableDistribution(tournament, tables);
        repository.save(tournament);
    }

    public void createFinalTable() {
        Tournament tournament = getCurrentTournament().orElseThrow(() ->
                new IllegalStateException("Turnier muss zuerst konfiguriert werden."));

        ensurePaused(tournament);

        int seatsPerTable = Math.max(1, tournament.getSeatsPerTable());
        if (Math.max(0, tournament.getPlayersLeft()) > seatsPerTable) {
            throw new IllegalStateException("Final Table ist erst möglich, wenn die verbleibenden Spieler auf einen Tisch passen.");
        }

        List<TableState> tables = getTableDistribution(tournament);
        Set<String> activeSet = getActivePlayerSet(tournament);
        List<String> finalPlayers = new ArrayList<>();
        for (TableState table : tables) {
            for (String player : table.players) {
                if (activeSet.contains(player) && !finalPlayers.contains(player)) {
                    finalPlayers.add(player);
                }
            }
        }

        if (finalPlayers.isEmpty()) {
            return;
        }

        TableState finalTable = new TableState();
        finalTable.tableName = "Tisch 1";
        finalTable.players = new ArrayList<>(finalPlayers);
        finalTable.neutralDealer = tournament.isHasNeutralDealer();
        assignRoles(finalTable);

        tournament.setTableCount(1);
        persistTableDistribution(tournament, List.of(finalTable));
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
        List<TournamentStatusResponse.TableDistributionEntry> distribution = toDistributionResponse(getTableDistribution(tournament));

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
                .seatsPerTable(tournament.getSeatsPerTable())
                .totalChips(totalChips)
                .averageStack(averageStack)
                .activePlayerNames(activePlayers)
                .eliminatedPlayerNames(eliminatedPlayers)
                .distribution(distribution)
                .running(STATUS_RUNNING.equals(status))
                .message(statusText)
                .build();
    }

    private void ensurePaused(Tournament tournament) {
        if (!STATUS_PAUSED.equals(normalizeStatus(tournament.getStatus()))) {
            throw new IllegalStateException("Aktion nur im pausierten Turnier möglich.");
        }
    }

    private List<TableState> createInitialDistribution(List<String> participants, int tableCount, boolean hasNeutralDealer) {
        int safeTableCount = Math.max(1, tableCount);
        List<String> shuffledPlayers = participants == null ? new ArrayList<>() : new ArrayList<>(participants);
        Collections.shuffle(shuffledPlayers);

        List<TableState> tables = new ArrayList<>();
        for (int i = 0; i < safeTableCount; i += 1) {
            TableState table = new TableState();
            table.tableName = "Tisch " + (i + 1);
            table.players = new ArrayList<>();
            table.neutralDealer = hasNeutralDealer;
            tables.add(table);
        }

        for (int i = 0; i < shuffledPlayers.size(); i += 1) {
            tables.get(i % safeTableCount).players.add(shuffledPlayers.get(i));
        }

        for (TableState table : tables) {
            if (table.players.size() > 1) {
                int startIndex = ThreadLocalRandom.current().nextInt(table.players.size());
                table.players = rotatePlayersFromIndex(table.players, startIndex);
            }
            assignRoles(table);
        }

        return tables;
    }

    private List<String> rotatePlayersFromIndex(List<String> players, int startIndex) {
        if (players.isEmpty()) {
            return players;
        }
        List<String> rotated = new ArrayList<>();
        rotated.addAll(players.subList(startIndex, players.size()));
        rotated.addAll(players.subList(0, startIndex));
        return rotated;
    }

    private void assignRoles(TableState table) {
        if (table.players == null) {
            table.players = new ArrayList<>();
        }

        int size = table.players.size();
        if (size == 0) {
            table.dealer = null;
            table.smallBlind = null;
            table.bigBlind = null;
            return;
        }

        if (table.neutralDealer) {
            table.dealer = null;
            table.smallBlind = table.players.get(0);
            table.bigBlind = size >= 2 ? table.players.get(1 % size) : null;
            return;
        }

        table.dealer = table.players.get(0);
        table.smallBlind = size >= 2 ? table.players.get(1 % size) : null;
        table.bigBlind = size >= 2 ? table.players.get(2 % size) : null;
    }

    private int countActivePlayers(TableState table, Set<String> activePlayers) {
        return (int) table.players.stream().filter(activePlayers::contains).count();
    }

    private Set<String> getActivePlayerSet(Tournament tournament) {
        List<String> eliminated = tournament.getEliminatedPlayers() == null ? List.of() : tournament.getEliminatedPlayers();
        return tournament.getParticipants().stream()
                .filter(name -> !eliminated.contains(name))
                .collect(Collectors.toSet());
    }

    private List<TableState> getTableDistribution(Tournament tournament) {
        String raw = tournament.getTableDistributionJson();
        if (raw == null || raw.isBlank()) {
            List<TableState> generated = createInitialDistribution(
                    tournament.getParticipants(),
                    tournament.getTableCount(),
                    tournament.isHasNeutralDealer()
            );
            persistTableDistribution(tournament, generated);
            return generated;
        }

        try {
            List<TableState> parsed = objectMapper.readValue(raw, TABLE_STATE_TYPE);
            if (parsed == null || parsed.isEmpty()) {
                throw new IllegalArgumentException("Empty distribution");
            }
            for (TableState table : parsed) {
                if (table.players == null) {
                    table.players = new ArrayList<>();
                }
                assignRoles(table);
            }
            return parsed;
        } catch (Exception ex) {
            List<TableState> generated = createInitialDistribution(
                    tournament.getParticipants(),
                    tournament.getTableCount(),
                    tournament.isHasNeutralDealer()
            );
            persistTableDistribution(tournament, generated);
            return generated;
        }
    }

    private void persistTableDistribution(Tournament tournament, List<TableState> distribution) {
        try {
            tournament.setTableDistributionJson(objectMapper.writeValueAsString(distribution));
        } catch (Exception ex) {
            throw new IllegalStateException("Tischverteilung konnte nicht gespeichert werden.", ex);
        }
    }

    private List<TournamentStatusResponse.TableDistributionEntry> toDistributionResponse(List<TableState> distribution) {
        List<TournamentStatusResponse.TableDistributionEntry> result = new ArrayList<>();
        for (TableState table : distribution) {
            TournamentStatusResponse.TableDistributionEntry entry = new TournamentStatusResponse.TableDistributionEntry();
            entry.setTableName(table.tableName);
            entry.setPlayers(new ArrayList<>(table.players));
            entry.setNeutralDealer(table.neutralDealer);
            entry.setDealer(table.dealer);
            entry.setSmallBlind(table.smallBlind);
            entry.setBigBlind(table.bigBlind);
            result.add(entry);
        }
        return result;
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

    private static class TableState {
        public String tableName;
        public List<String> players = new ArrayList<>();
        public boolean neutralDealer;
        public String dealer;
        public String smallBlind;
        public String bigBlind;
    }
}
