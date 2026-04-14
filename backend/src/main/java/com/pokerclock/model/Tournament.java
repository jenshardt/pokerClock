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
    private boolean hasNeutralDealer;
    private boolean rebuyAllowed;
    private String status;
    private int entries;
    private int playersLeft;
    private int rebuys;
    private long accumulatedElapsedSeconds;
    private Instant createdAt;
    private Instant startedAt;
    private Instant resumedAt;
    private boolean running;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String tableDistributionJson;

    @ElementCollection
    @CollectionTable(name = "tournament_participants", joinColumns = @JoinColumn(name = "tournament_id"))
    @Column(name = "participant")
    private List<String> participants = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "tournament_eliminated_players", joinColumns = @JoinColumn(name = "tournament_id"))
    @Column(name = "player_name")
    private List<String> eliminatedPlayers = new ArrayList<>();

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

    public boolean isHasNeutralDealer() {
        return hasNeutralDealer;
    }

    public void setHasNeutralDealer(boolean hasNeutralDealer) {
        this.hasNeutralDealer = hasNeutralDealer;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public int getEntries() {
        return entries;
    }

    public void setEntries(int entries) {
        this.entries = entries;
    }

    public int getPlayersLeft() {
        return playersLeft;
    }

    public void setPlayersLeft(int playersLeft) {
        this.playersLeft = playersLeft;
    }

    public int getRebuys() {
        return rebuys;
    }

    public void setRebuys(int rebuys) {
        this.rebuys = rebuys;
    }

    public long getAccumulatedElapsedSeconds() {
        return accumulatedElapsedSeconds;
    }

    public void setAccumulatedElapsedSeconds(long accumulatedElapsedSeconds) {
        this.accumulatedElapsedSeconds = accumulatedElapsedSeconds;
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

    public Instant getResumedAt() {
        return resumedAt;
    }

    public void setResumedAt(Instant resumedAt) {
        this.resumedAt = resumedAt;
    }

    public boolean isRunning() {
        return running;
    }

    public void setRunning(boolean running) {
        this.running = running;
    }

    public String getTableDistributionJson() {
        return tableDistributionJson;
    }

    public void setTableDistributionJson(String tableDistributionJson) {
        this.tableDistributionJson = tableDistributionJson;
    }

    public List<String> getParticipants() {
        return participants;
    }

    public void setParticipants(List<String> participants) {
        this.participants = participants;
    }

    public List<String> getEliminatedPlayers() {
        return eliminatedPlayers;
    }

    public void setEliminatedPlayers(List<String> eliminatedPlayers) {
        this.eliminatedPlayers = eliminatedPlayers;
    }
}
