package com.pokerclock.service;

import com.pokerclock.api.*;
import com.pokerclock.model.RegistrationBlindLevel;
import com.pokerclock.model.RegistrationTemplate;
import com.pokerclock.repository.RegistrationTemplateRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class RegistrationTemplateService {

    private final RegistrationTemplateRepository repository;
    private final TournamentService tournamentService;

    public RegistrationTemplateService(RegistrationTemplateRepository repository, TournamentService tournamentService) {
        this.repository = repository;
        this.tournamentService = tournamentService;
    }

    public RegistrationTemplateResponse save(RegistrationTemplateRequest request) {
        validate(request);

        RegistrationTemplate entity = toEntity(request);
        Instant now = Instant.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);

        RegistrationTemplate saved = repository.save(entity);
        return toResponse(saved);
    }

    public Optional<RegistrationTemplateResponse> getLatest() {
        return repository.findTopByOrderByUpdatedAtDesc().map(this::toResponse);
    }

    public RegistrationTemplateResponse exportById(Long id) {
        RegistrationTemplate template = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Template nicht gefunden: " + id));
        return toResponse(template);
    }

    public RegistrationTemplateResponse importTemplate(RegistrationTemplateRequest request) {
        return save(request);
    }

    public CreateTournamentResponse createTournament(Long templateId) {
        RegistrationTemplate template = repository.findById(templateId)
                .orElseThrow(() -> new IllegalArgumentException("Template nicht gefunden: " + templateId));

        TournamentSetupRequest request = new TournamentSetupRequest();
        request.setTournamentName(template.getTournamentName());
        request.setParticipants(new ArrayList<>(template.getParticipants()));
        request.setTableCount(template.getTableCount());
        request.setSeatsPerTable(template.getSeatsPerTable());
        request.setStartingChips(template.getStartingStack());
        request.setRebuyAllowed(template.isRebuyEnabled());

        String blindStructure = template.getBlindLevels().stream()
                .map(level -> level.getSmallBlind() + "/" + level.getBigBlind())
                .collect(Collectors.joining(","));
        request.setBlindStructure(blindStructure);

        int firstDurationMinutes = template.getBlindLevels().isEmpty()
                ? 20
                : template.getBlindLevels().get(0).getDurationMinutes();
        request.setBlindDurationSeconds(firstDurationMinutes * 60);

        tournamentService.setupTournament(request);
        return new CreateTournamentResponse(templateId, "Turnier wurde aus Vorlage erstellt.");
    }

    private RegistrationTemplate toEntity(RegistrationTemplateRequest request) {
        RegistrationTemplate entity = new RegistrationTemplate();
        entity.setTournamentName(request.getTournamentName());
        entity.setLocation(request.getLocation());
        entity.setStartingStack(request.getStartingStack());
        entity.setBuyInEuro(request.getBuyInEuro());
        entity.setRebuyEnabled(request.isRebuyEnabled());
        entity.setRebuyMode(request.getRebuyMode());
        entity.setRebuyMaxCount(request.getRebuyMaxCount());
        entity.setReentryPriceEuro(request.getReentryPriceEuro());
        entity.setReentryStack(request.getReentryStack());
        entity.setTableCount(request.getTableCount());
        entity.setSeatsPerTable(request.getSeatsPerTable());
        entity.setHasNeutralDealer(request.isHasNeutralDealer());
        entity.setParticipants(new ArrayList<>(request.getParticipants()));

        List<RegistrationBlindLevel> levels = request.getBlindLevels().stream().map(level -> {
            RegistrationBlindLevel entityLevel = new RegistrationBlindLevel();
            entityLevel.setLevelOrder(level.getLevel());
            entityLevel.setSmallBlind(level.getSmallBlind());
            entityLevel.setBigBlind(level.getBigBlind());
            entityLevel.setDurationMinutes(level.getDurationMinutes());
            entityLevel.setBreakMinutes(level.getBreakMinutes());
            return entityLevel;
        }).toList();
        entity.setBlindLevels(levels);
        return entity;
    }

    private RegistrationTemplateResponse toResponse(RegistrationTemplate entity) {
        RegistrationTemplateResponse response = new RegistrationTemplateResponse();
        response.setId(entity.getId());
        response.setTournamentName(entity.getTournamentName());
        response.setLocation(entity.getLocation());
        response.setStartingStack(entity.getStartingStack());
        response.setBuyInEuro(entity.getBuyInEuro());
        response.setRebuyEnabled(entity.isRebuyEnabled());
        response.setRebuyMode(entity.getRebuyMode());
        response.setRebuyMaxCount(entity.getRebuyMaxCount());
        response.setReentryPriceEuro(entity.getReentryPriceEuro());
        response.setReentryStack(entity.getReentryStack());
        response.setTableCount(entity.getTableCount());
        response.setSeatsPerTable(entity.getSeatsPerTable());
        response.setHasNeutralDealer(entity.isHasNeutralDealer());
        response.setParticipants(new ArrayList<>(entity.getParticipants()));
        response.setBlindLevels(entity.getBlindLevels().stream().map(level -> {
            BlindLevelRequest dto = new BlindLevelRequest();
            dto.setLevel(level.getLevelOrder());
            dto.setSmallBlind(level.getSmallBlind());
            dto.setBigBlind(level.getBigBlind());
            dto.setDurationMinutes(level.getDurationMinutes());
            dto.setBreakMinutes(level.getBreakMinutes());
            return dto;
        }).toList());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }

    private void validate(RegistrationTemplateRequest request) {
        if (request.getParticipants() == null || request.getParticipants().size() < 2) {
            throw new IllegalArgumentException("Mindestens 2 Teilnehmer sind erforderlich.");
        }
        if (request.getBlindLevels() == null || request.getBlindLevels().isEmpty()) {
            throw new IllegalArgumentException("Mindestens eine Blindstufe ist erforderlich.");
        }
    }
}