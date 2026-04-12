package com.pokerclock.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tournaments")
public class Tournament {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String tournamentName;
    private int tableCount;
    private int seatsPerTable;
    private int startingChips;
    private String blindStructure;
    private int blindDurationSeconds;
    private boolean rebuyAllowed;
    private Instant createdAt;
    private Instant startedAt;
    private boolean running;

    @ElementCollection
    @CollectionTable(name = "tournament_participants", joinColumns = @JoinColumn(name = "tournament_id"))
    @Column(name = "participant")
    private List<String> participants = new ArrayList<>();

    public Tournament() {
    }

    public Long getId() {
        return id;
    }

    public String getTournamentName() {
        return tournamentName;
    }

    public void setTournamentName(String tournamentName) {
        this.tournamentName = tournamentName;
    }

    public int getTableCount() {
        return tableCount;
    }

    public void setTableCount(int tableCount) {
        this.tableCount = tableCount;
    }

    public int getSeatsPerTable() {
        return seatsPerTable;
    }

    public void setSeatsPerTable(int seatsPerTable) {
        this.seatsPerTable = seatsPerTable;
    }

    public int getStartingChips() {
        return startingChips;
    }

    public void setStartingChips(int startingChips) {
        this.startingChips = startingChips;
    }

    public String getBlindStructure() {
        return blindStructure;
    }

    public void setBlindStructure(String blindStructure) {
        this.blindStructure = blindStructure;
    }

    public int getBlindDurationSeconds() {
        return blindDurationSeconds;
    }

    public void setBlindDurationSeconds(int blindDurationSeconds) {
        this.blindDurationSeconds = blindDurationSeconds;
    }

    public boolean isRebuyAllowed() {
        return rebuyAllowed;
    }

    public void setRebuyAllowed(boolean rebuyAllowed) {
        this.rebuyAllowed = rebuyAllowed;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public boolean isRunning() {
        return running;
    }

    public void setRunning(boolean running) {
        this.running = running;
    }

    public List<String> getParticipants() {
        return participants;
    }

    public void setParticipants(List<String> participants) {
        this.participants = participants;
    }
}
