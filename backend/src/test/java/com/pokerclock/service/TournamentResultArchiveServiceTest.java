package com.pokerclock.service;

import com.pokerclock.api.TournamentResultPayoutEntryRequest;
import com.pokerclock.api.TournamentResultSaveRequest;
import com.pokerclock.model.Tournament;
import com.pokerclock.model.TournamentCompletionReason;
import com.pokerclock.model.TournamentResultArchive;
import com.pokerclock.repository.TournamentRepository;
import com.pokerclock.repository.TournamentResultArchiveRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TournamentResultArchiveServiceTest {

    @Mock
    private TournamentResultArchiveRepository resultRepository;

    @Mock
    private TournamentRepository tournamentRepository;

    @Test
    void saveResultLinksArchiveToCurrentCompletedTournament() {
        Tournament tournament = new Tournament();
        tournament.setId(42L);
        tournament.setCompletionReason(TournamentCompletionReason.COMPLETED);
        TournamentResultSaveRequest request = resultRequest();
        when(tournamentRepository.findTopByOrderByCreatedAtDesc()).thenReturn(Optional.of(tournament));
        when(resultRepository.findTopByTournamentIdOrderBySavedAtDesc(42L)).thenReturn(Optional.empty());
        when(resultRepository.save(any(TournamentResultArchive.class))).thenAnswer(invocation -> invocation.getArgument(0));

        new TournamentResultArchiveService(resultRepository, tournamentRepository, new ObjectMapper()).saveResult(request);

        ArgumentCaptor<TournamentResultArchive> captor = ArgumentCaptor.forClass(TournamentResultArchive.class);
        verify(resultRepository).save(captor.capture());
        assertThat(captor.getValue().getTournamentId()).isEqualTo(42L);
    }

    @Test
    void getPayoutSummaryReadsStoredPayoutEntries() throws Exception {
        TournamentResultArchive archive = new TournamentResultArchive();
        archive.setPayloadJson(new ObjectMapper().writeValueAsString(resultRequest()));
        when(resultRepository.findTopByTournamentIdOrderBySavedAtDesc(42L)).thenReturn(Optional.of(archive));

        var summary = new TournamentResultArchiveService(resultRepository, tournamentRepository, new ObjectMapper())
                .getPayoutSummary(42L);

        assertThat(summary).singleElement().satisfies(entry -> {
            assertThat(entry.place()).isEqualTo(1);
            assertThat(entry.playerName()).isEqualTo("Alice");
            assertThat(entry.amountEuro()).isEqualByComparingTo("100.00");
        });
    }

    private TournamentResultSaveRequest resultRequest() {
        TournamentResultPayoutEntryRequest payout = new TournamentResultPayoutEntryRequest();
        payout.setPlace(1);
        payout.setLabel("1. Platz");
        payout.setPlayerName("Alice");
        payout.setPercent(new BigDecimal("100"));
        payout.setAmountEuro(new BigDecimal("100.00"));

        TournamentResultSaveRequest request = new TournamentResultSaveRequest();
        request.setTournamentName("Sunday Major");
        request.setPayouts(List.of(payout));
        return request;
    }
}