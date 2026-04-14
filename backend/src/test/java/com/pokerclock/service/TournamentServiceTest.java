package com.pokerclock.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pokerclock.api.TournamentSetupRequest;
import com.pokerclock.api.TournamentStatusResponse;
import com.pokerclock.model.Tournament;
import com.pokerclock.repository.TournamentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TournamentServiceTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Mock
    private TournamentRepository repository;

    @InjectMocks
    private TournamentService tournamentService;

    private Tournament tournament;

    @BeforeEach
    void setUp() {
        tournament = new Tournament();
        tournament.setTournamentName("Test Cup");
        tournament.setParticipants(new ArrayList<>(List.of("Alice", "Bob", "Chris", "Dana", "Erik", "Finn")));
        tournament.setEliminatedPlayers(new ArrayList<>());
        tournament.setTableCount(2);
        tournament.setSeatsPerTable(8);
        tournament.setStartingChips(10000);
        tournament.setBlindStructure("L:50/100:20,B:10,L:100/200:20");
        tournament.setBlindDurationSeconds(1200);
        tournament.setStatus("READY");
        tournament.setEntries(6);
        tournament.setPlayersLeft(6);
        tournament.setRebuys(0);
        tournament.setHasNeutralDealer(false);
        tournament.setCreatedAt(Instant.now());
    }

    @Test
    void setupTournamentPersistsCoreConfiguration() {
        TournamentSetupRequest request = new TournamentSetupRequest();
        request.setTournamentName("Sunday Major");
        request.setParticipants(List.of("A", "B", "C", "D"));
        request.setTableCount(2);
        request.setSeatsPerTable(8);
        request.setStartingChips(15000);
        request.setBlindStructure("L:25/50:20,L:50/100:20");
        request.setBlindDurationSeconds(1200);
        request.setHasNeutralDealer(true);
        request.setRebuyAllowed(true);

        when(repository.save(any(Tournament.class))).thenAnswer(invocation -> invocation.getArgument(0));

        tournamentService.setupTournament(request);

        ArgumentCaptor<Tournament> captor = ArgumentCaptor.forClass(Tournament.class);
        verify(repository).save(captor.capture());
        Tournament saved = captor.getValue();

        assertEquals("Sunday Major", saved.getTournamentName());
        assertEquals(4, saved.getEntries());
        assertEquals(4, saved.getPlayersLeft());
        assertEquals("READY", saved.getStatus());
        assertTrue(saved.getTableDistributionJson() != null && !saved.getTableDistributionJson().isBlank());
    }

    @Test
    void startTournamentSetsRunningState() {
        when(repository.findTopByOrderByCreatedAtDesc()).thenReturn(Optional.of(tournament));
        when(repository.save(any(Tournament.class))).thenAnswer(invocation -> invocation.getArgument(0));

        tournamentService.startTournament();

        assertEquals("RUNNING", tournament.getStatus());
        assertTrue(tournament.isRunning());
        assertNotNull(tournament.getStartedAt());
        assertNotNull(tournament.getResumedAt());
        verify(repository, times(1)).save(tournament);
    }

    @Test
    void pauseTournamentFromRunningAccumulatesAndStopsClock() {
        tournament.setStatus("RUNNING");
        tournament.setRunning(true);
        tournament.setAccumulatedElapsedSeconds(0);
        tournament.setResumedAt(Instant.now().minusSeconds(5));

        when(repository.findTopByOrderByCreatedAtDesc()).thenReturn(Optional.of(tournament));
        when(repository.save(any(Tournament.class))).thenAnswer(invocation -> invocation.getArgument(0));

        tournamentService.pauseTournament();

        assertEquals("PAUSED", tournament.getStatus());
        assertFalse(tournament.isRunning());
        assertEquals(null, tournament.getResumedAt());
        assertTrue(tournament.getAccumulatedElapsedSeconds() >= 4);
    }

    @Test
    void balanceTablesMovesOnePlayerWhenDifferenceIsLargeEnough() throws Exception {
        tournament.setStatus("PAUSED");
        tournament.setTableDistributionJson("""
                [
                  {"tableName":"Tisch 1","players":["Alice","Bob","Chris","Dana"],"neutralDealer":false,"dealer":"Alice","smallBlind":"Bob","bigBlind":"Chris"},
                  {"tableName":"Tisch 2","players":["Erik","Finn"],"neutralDealer":false,"dealer":"Erik","smallBlind":"Finn","bigBlind":"Erik"}
                ]
                """);

        when(repository.findTopByOrderByCreatedAtDesc()).thenReturn(Optional.of(tournament));
        when(repository.save(any(Tournament.class))).thenAnswer(invocation -> invocation.getArgument(0));

        tournamentService.balanceTables();

        verify(repository).save(tournament);

        JsonNode root = OBJECT_MAPPER.readTree(tournament.getTableDistributionJson());
        JsonNode table1Players = root.get(0).get("players");
        JsonNode table2Players = root.get(1).get("players");

        assertEquals(3, table1Players.size());
        assertEquals(3, table2Players.size());
        assertEquals("Dana", table2Players.get(2).asText());
    }

    @Test
    void createFinalTableBuildsSingleTableWithActivePlayersOnly() throws Exception {
        tournament.setStatus("PAUSED");
        tournament.setPlayersLeft(3);
        tournament.setSeatsPerTable(5);
        tournament.setEliminatedPlayers(new ArrayList<>(List.of("Chris", "Finn")));
        tournament.setTableDistributionJson("""
                [
                  {"tableName":"Tisch 1","players":["Alice","Chris","Dana"],"neutralDealer":false,"dealer":"Alice","smallBlind":"Chris","bigBlind":"Dana"},
                  {"tableName":"Tisch 2","players":["Bob","Erik","Finn"],"neutralDealer":false,"dealer":"Bob","smallBlind":"Erik","bigBlind":"Finn"}
                ]
                """);

        when(repository.findTopByOrderByCreatedAtDesc()).thenReturn(Optional.of(tournament));
        when(repository.save(any(Tournament.class))).thenAnswer(invocation -> invocation.getArgument(0));

        tournamentService.createFinalTable();

        assertEquals(1, tournament.getTableCount());

        JsonNode root = OBJECT_MAPPER.readTree(tournament.getTableDistributionJson());
        assertEquals(1, root.size());
        assertEquals("Tisch 1", root.get(0).get("tableName").asText());

        List<String> activeInOrder = List.of(
                root.get(0).get("players").get(0).asText(),
                root.get(0).get("players").get(1).asText(),
                root.get(0).get("players").get(2).asText(),
                root.get(0).get("players").get(3).asText()
        );
        assertEquals(List.of("Alice", "Dana", "Bob", "Erik"), activeInOrder);
        verify(repository).save(tournament);
    }

    @Test
    void createFinalTableThrowsWhenTournamentIsNotPaused() {
        tournament.setStatus("RUNNING");

        when(repository.findTopByOrderByCreatedAtDesc()).thenReturn(Optional.of(tournament));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> tournamentService.createFinalTable());
        assertEquals("Aktion nur im pausierten Turnier möglich.", ex.getMessage());
    }

    @Test
    void getStatusReturnsFallbackWhenNoTournamentExists() {
        when(repository.findTopByOrderByCreatedAtDesc()).thenReturn(Optional.empty());

        TournamentStatusResponse response = tournamentService.getStatus();

        assertEquals("Kein Turnier konfiguriert", response.getMessage());
    }
}
