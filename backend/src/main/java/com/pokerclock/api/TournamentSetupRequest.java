package com.pokerclock.api;

import java.util.List;

public class TournamentSetupRequest {

    private String tournamentName;
    private List<String> participants;
    private int tableCount;
    private int seatsPerTable;
    private int startingChips;
    private String blindStructure;
    private int blindDurationSeconds;
    private boolean hasNeutralDealer;
    private boolean rebuyAllowed;

    public String getTournamentName() {
        return tournamentName;
    }

    public void setTournamentName(String tournamentName) {
        this.tournamentName = tournamentName;
    }

    public List<String> getParticipants() {
        return participants;
    }

    public void setParticipants(List<String> participants) {
        this.participants = participants;
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

    public boolean isHasNeutralDealer() {
        return hasNeutralDealer;
    }

    public void setHasNeutralDealer(boolean hasNeutralDealer) {
        this.hasNeutralDealer = hasNeutralDealer;
    }

    public boolean isRebuyAllowed() {
        return rebuyAllowed;
    }

    public void setRebuyAllowed(boolean rebuyAllowed) {
        this.rebuyAllowed = rebuyAllowed;
    }
}
