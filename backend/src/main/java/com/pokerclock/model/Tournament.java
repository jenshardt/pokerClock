package com.pokerclock.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "tournaments")
public class Tournament {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private long version;

    private String tournamentName;
    private int tableCount;
    private int seatsPerTable;
    private int startingChips;
    private String blindStructure;
    private int blindDurationSeconds;
    private boolean hasNeutralDealer;
    private boolean rebuyAllowed;
    private String rebuyMode;
    private Integer rebuyMaxCount;
    private boolean rebuyWindowClosed;
    private boolean payoutSummaryEnabled;
    private String status;
    private String workflowPhase;
    @Enumerated(EnumType.STRING)
    private TournamentCompletionReason completionReason;
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

    @ElementCollection
    @CollectionTable(name = "tournament_rebuy_counts", joinColumns = @JoinColumn(name = "tournament_id"))
    @MapKeyColumn(name = "player_name")
    @Column(name = "rebuy_count")
    private Map<String, Integer> rebuyCounts = new HashMap<>();

    public Tournament() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public long getVersion() {
        return version;
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

    public boolean isPayoutSummaryEnabled() {
        return payoutSummaryEnabled;
    }

    public void setPayoutSummaryEnabled(boolean payoutSummaryEnabled) {
        this.payoutSummaryEnabled = payoutSummaryEnabled;
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

    public String getWorkflowPhase() {
        return workflowPhase;
    }

    public void setWorkflowPhase(String workflowPhase) {
        this.workflowPhase = workflowPhase;
    }

    public TournamentCompletionReason getCompletionReason() {
        return completionReason;
    }

    public void setCompletionReason(TournamentCompletionReason completionReason) {
        this.completionReason = completionReason;
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

    public String getRebuyMode() {
        return rebuyMode;
    }

    public void setRebuyMode(String rebuyMode) {
        this.rebuyMode = rebuyMode;
    }

    public Integer getRebuyMaxCount() {
        return rebuyMaxCount;
    }

    public void setRebuyMaxCount(Integer rebuyMaxCount) {
        this.rebuyMaxCount = rebuyMaxCount;
    }

    public boolean isRebuyWindowClosed() {
        return rebuyWindowClosed;
    }

    public void setRebuyWindowClosed(boolean rebuyWindowClosed) {
        this.rebuyWindowClosed = rebuyWindowClosed;
    }

    public Map<String, Integer> getRebuyCounts() {
        return rebuyCounts;
    }

    public void setRebuyCounts(Map<String, Integer> rebuyCounts) {
        this.rebuyCounts = rebuyCounts;
    }
}
