package com.pokerclock.service;

import com.pokerclock.api.TournamentResultSaveRequest;
import com.pokerclock.api.TournamentResultSaveResponse;
import com.pokerclock.api.TournamentPayoutSummaryEntry;
import com.pokerclock.model.Tournament;
import com.pokerclock.model.TournamentCompletionReason;
import com.pokerclock.model.TournamentResultArchive;
import com.pokerclock.repository.TournamentResultArchiveRepository;
import com.pokerclock.repository.TournamentRepository;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;

@Service
public class TournamentResultArchiveService {

    private final TournamentResultArchiveRepository repository;
    private final TournamentRepository tournamentRepository;
    private final ObjectMapper objectMapper;

    public TournamentResultArchiveService(
            TournamentResultArchiveRepository repository,
            TournamentRepository tournamentRepository,
            ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.tournamentRepository = tournamentRepository;
        this.objectMapper = objectMapper;
    }

    public TournamentResultSaveResponse saveResult(TournamentResultSaveRequest request) {
        String tournamentName = request.getTournamentName() == null ? "" : request.getTournamentName().trim();
        if (tournamentName.isEmpty()) {
            throw new IllegalArgumentException("Turniername ist erforderlich.");
        }

        Tournament tournament = tournamentRepository.findTopByOrderByCreatedAtDesc()
            .orElseThrow(() -> new IllegalStateException("Kein Turnier für das Ergebnis vorhanden."));
        if (tournament.getCompletionReason() != TournamentCompletionReason.COMPLETED) {
            throw new IllegalStateException("Ergebnisse können erst nach regulärem Turnierende gespeichert werden.");
        }

        TournamentResultArchive archive = repository.findTopByTournamentIdOrderBySavedAtDesc(tournament.getId())
            .orElseGet(TournamentResultArchive::new);
        archive.setTournamentId(tournament.getId());
        archive.setTournamentName(tournamentName);
        archive.setSavedAt(Instant.now());
        archive.setPayloadJson(toJson(request));

        TournamentResultArchive saved = repository.save(archive);
        return new TournamentResultSaveResponse(saved.getId(), saved.getSavedAt(), "Turnierergebnis wurde gespeichert.");
    }

    public List<TournamentPayoutSummaryEntry> getPayoutSummary(Long tournamentId) {
        if (tournamentId == null) {
            return List.of();
        }

        return repository.findTopByTournamentIdOrderBySavedAtDesc(tournamentId)
                .map(this::readPayoutSummary)
                .orElseGet(List::of);
    }

    private List<TournamentPayoutSummaryEntry> readPayoutSummary(TournamentResultArchive archive) {
        try {
            TournamentResultSaveRequest request = objectMapper.readValue(archive.getPayloadJson(), TournamentResultSaveRequest.class);
            return request.getPayouts().stream()
                    .map(payout -> new TournamentPayoutSummaryEntry(
                            payout.getPlace(),
                            payout.getLabel(),
                            payout.getPlayerName(),
                            payout.getPercent(),
                            payout.getAmountEuro()
                    ))
                    .toList();
        } catch (Exception exception) {
            throw new IllegalStateException("Gespeicherte Auszahlung konnte nicht gelesen werden.", exception);
        }
    }

    private String toJson(TournamentResultSaveRequest request) {
        try {
            return objectMapper.writeValueAsString(request);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Turnierergebnis konnte nicht serialisiert werden.", ex);
        }
    }
}
