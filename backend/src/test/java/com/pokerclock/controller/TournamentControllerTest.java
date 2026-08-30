package com.pokerclock.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pokerclock.api.PlayerActionRequest;
import com.pokerclock.api.TournamentStatusResponse;
import com.pokerclock.service.TournamentResultArchiveService;
import com.pokerclock.service.TournamentService;
import org.springframework.dao.OptimisticLockingFailureException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class TournamentControllerTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private TournamentService tournamentService;

    @Mock
    private TournamentResultArchiveService resultArchiveService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        TournamentController controller = new TournamentController(tournamentService, resultArchiveService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void getStatusReturnsPayloadFromService() throws Exception {
        TournamentStatusResponse statusResponse = TournamentStatusResponse.builder()
                .tournamentName("Sunday Major")
                .status("Turnier läuft")
                .message("Turnier läuft")
                .build();

        when(tournamentService.getStatus()).thenReturn(statusResponse);

        mockMvc.perform(get("/api/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tournamentName").value("Sunday Major"))
                .andExpect(jsonPath("$.status").value("Turnier läuft"));

        verify(tournamentService).getStatus();
    }

    @Test
    void seatOpenPassesPlayerNameToService() throws Exception {
        PlayerActionRequest request = new PlayerActionRequest();
        request.setPlayerName("Alice");

        mockMvc.perform(post("/api/seat-open")
                        .header("If-Match", 0)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(tournamentService).seatOpen("Alice", 0);
    }

    @Test
    void balanceTablesReturnsConflictWhenServiceThrowsIllegalState() throws Exception {
        doThrow(new IllegalStateException("Aktion nur im pausierten Turnier möglich."))
                .when(tournamentService).balanceTables(0);

        mockMvc.perform(post("/api/table/balance").header("If-Match", 0))
                .andExpect(status().isConflict())
                .andExpect(content().string("Aktion nur im pausierten Turnier möglich."));
    }

    @Test
    void createFinalTableReturnsConflictWhenServiceThrowsIllegalState() throws Exception {
        doThrow(new IllegalStateException("Final Table ist erst möglich, wenn die verbleibenden Spieler auf einen Tisch passen."))
                .when(tournamentService).createFinalTable(0);

        mockMvc.perform(post("/api/table/final-table").header("If-Match", 0))
                .andExpect(status().isConflict())
                .andExpect(content().string("Final Table ist erst möglich, wenn die verbleibenden Spieler auf einen Tisch passen."));
    }

    @Test
    void startCallsServiceAndReturnsOk() throws Exception {
        mockMvc.perform(post("/api/start").header("If-Match", 0))
                .andExpect(status().isOk());

        verify(tournamentService).startTournament(0);
    }

    @Test
    void showTournamentCallsServiceAndReturnsOk() throws Exception {
        mockMvc.perform(post("/api/show-tournament").header("If-Match", 0))
                .andExpect(status().isOk());

        verify(tournamentService).showTournament(0);
    }

    @Test
    void pauseReturnsConflictForStaleVersion() throws Exception {
        doThrow(new OptimisticLockingFailureException("Turnier wurde auf einem anderen Gerät geändert."))
                .when(tournamentService).pauseTournament(0);

        mockMvc.perform(post("/api/pause").header("If-Match", 0))
                .andExpect(status().isConflict())
                .andExpect(content().string("Turnier wurde auf einem anderen Gerät geändert."));
    }
}
