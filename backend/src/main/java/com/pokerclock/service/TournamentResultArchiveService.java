package com.pokerclock.service;

import com.pokerclock.api.TournamentResultSaveRequest;
import com.pokerclock.api.TournamentResultSaveResponse;
import com.pokerclock.model.TournamentResultArchive;
import com.pokerclock.repository.TournamentResultArchiveRepository;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;

@Service
public class TournamentResultArchiveService {

    private final TournamentResultArchiveRepository repository;
    private final ObjectMapper objectMapper;

    public TournamentResultArchiveService(TournamentResultArchiveRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    public TournamentResultSaveResponse saveResult(TournamentResultSaveRequest request) {
        String tournamentName = request.getTournamentName() == null ? "" : request.getTournamentName().trim();
        if (tournamentName.isEmpty()) {
            throw new IllegalArgumentException("Turniername ist erforderlich.");
        }

        TournamentResultArchive archive = new TournamentResultArchive();
        archive.setTournamentName(tournamentName);
        archive.setSavedAt(Instant.now());
        archive.setPayloadJson(toJson(request));

        TournamentResultArchive saved = repository.save(archive);
        return new TournamentResultSaveResponse(saved.getId(), saved.getSavedAt(), "Turnierergebnis wurde gespeichert.");
    }

    private String toJson(TournamentResultSaveRequest request) {
        try {
            return objectMapper.writeValueAsString(request);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Turnierergebnis konnte nicht serialisiert werden.", ex);
        }
    }
}
