package com.pokerclock.controller;

import com.pokerclock.config.AuthInterceptor;
import com.pokerclock.model.UserRole;
import com.pokerclock.service.AuthService;
import com.pokerclock.service.RegistrationTemplateService;
import com.pokerclock.service.TournamentResultArchiveService;
import com.pokerclock.service.TournamentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.Optional;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class RoleAuthorizationTest {

    @Mock
    private AuthService authService;

    @Mock
    private TournamentService tournamentService;

    @Mock
    private TournamentResultArchiveService resultArchiveService;

    @Mock
    private RegistrationTemplateService registrationTemplateService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AuthInterceptor authInterceptor = new AuthInterceptor(authService);
        TournamentController controller = new TournamentController(tournamentService, resultArchiveService);
        RegistrationController registrationController = new RegistrationController(registrationTemplateService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller, registrationController)
                .addInterceptors(authInterceptor)
                .build();
    }

    @Test
    void tableUserCanReadTournamentStatus() throws Exception {
        authenticate("table-token", UserRole.TABLE);

        mockMvc.perform(get("/api/status").header("X-Auth-Token", "table-token"))
                .andExpect(status().isOk());

        verify(tournamentService).getStatus();
    }

    @Test
    void tableUserCannotPauseTournament() throws Exception {
        authenticate("table-token", UserRole.TABLE);

        mockMvc.perform(post("/api/pause")
                        .header("X-Auth-Token", "table-token")
                        .header("If-Match", 0))
                .andExpect(status().isForbidden());

        verify(tournamentService, never()).pauseTournament(0);
    }

    @Test
    void floormanCanPauseTournament() throws Exception {
        authenticate("floorman-token", UserRole.FLOORMAN);

        mockMvc.perform(post("/api/pause")
                        .header("X-Auth-Token", "floorman-token")
                        .header("If-Match", 0))
                .andExpect(status().isOk());

        verify(tournamentService).pauseTournament(0);
    }

    @Test
    void floormanCanRegisterRebuy() throws Exception {
        authenticate("floorman-token", UserRole.FLOORMAN);

        mockMvc.perform(post("/api/rebuy")
                        .header("X-Auth-Token", "floorman-token")
                        .header("If-Match", 0)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Alice\"}"))
                .andExpect(status().isOk());

        verify(tournamentService).registerRebuy("Alice", 0);
    }

    @Test
    void floormanCannotReadRegistrationTemplates() throws Exception {
        authenticate("floorman-token", UserRole.FLOORMAN);

        mockMvc.perform(get("/api/registration/templates/latest").header("X-Auth-Token", "floorman-token"))
                .andExpect(status().isForbidden());

        verify(registrationTemplateService, never()).getLatest();
    }

    private void authenticate(String token, UserRole role) {
        AuthService.SessionUser user = new AuthService.SessionUser("test", role, Instant.now());
        when(authService.resolveSession(token)).thenReturn(Optional.of(user));
    }
}