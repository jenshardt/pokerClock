package com.pokerclock.api;

import java.util.ArrayList;
import java.util.List;

public class TournamentStatusResponse {

    private String tournamentName;
    private String currentBlind;
    private Integer currentSmallBlind;
    private Integer currentBigBlind;
    private Integer currentLevelNumber;
    private String nextItem;
    private String status;
    private long remainingSeconds;
    private long elapsedSeconds;
    private long timeToNextBreakSeconds;
    private String nextPhase;
    private int entries;
    private int activePlayers;
    private int playersLeft;
    private int rebuys;
    private int startingStack;
    private long totalChips;
    private long averageStack;
    private List<String> activePlayerNames = new ArrayList<>();
    private List<String> eliminatedPlayerNames = new ArrayList<>();
    private boolean running;
    private String message;

    public static Builder builder() {
        return new Builder();
    }

    public String getTournamentName() {
        return tournamentName;
    }

    public void setTournamentName(String tournamentName) {
        this.tournamentName = tournamentName;
    }

    public String getCurrentBlind() {
        return currentBlind;
    }

    public void setCurrentBlind(String currentBlind) {
        this.currentBlind = currentBlind;
    }

    public Integer getCurrentSmallBlind() {
        return currentSmallBlind;
    }

    public void setCurrentSmallBlind(Integer currentSmallBlind) {
        this.currentSmallBlind = currentSmallBlind;
    }

    public Integer getCurrentBigBlind() {
        return currentBigBlind;
    }

    public void setCurrentBigBlind(Integer currentBigBlind) {
        this.currentBigBlind = currentBigBlind;
    }

    public Integer getCurrentLevelNumber() {
        return currentLevelNumber;
    }

    public void setCurrentLevelNumber(Integer currentLevelNumber) {
        this.currentLevelNumber = currentLevelNumber;
    }

    public String getNextItem() {
        return nextItem;
    }

    public void setNextItem(String nextItem) {
        this.nextItem = nextItem;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public long getRemainingSeconds() {
        return remainingSeconds;
    }

    public void setRemainingSeconds(long remainingSeconds) {
        this.remainingSeconds = remainingSeconds;
    }

    public long getElapsedSeconds() {
        return elapsedSeconds;
    }

    public void setElapsedSeconds(long elapsedSeconds) {
        this.elapsedSeconds = elapsedSeconds;
    }

    public long getTimeToNextBreakSeconds() {
        return timeToNextBreakSeconds;
    }

    public void setTimeToNextBreakSeconds(long timeToNextBreakSeconds) {
        this.timeToNextBreakSeconds = timeToNextBreakSeconds;
    }

    public String getNextPhase() {
        return nextPhase;
    }

    public void setNextPhase(String nextPhase) {
        this.nextPhase = nextPhase;
    }

    public int getActivePlayers() {
        return activePlayers;
    }

    public void setActivePlayers(int activePlayers) {
        this.activePlayers = activePlayers;
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

    public int getStartingStack() {
        return startingStack;
    }

    public void setStartingStack(int startingStack) {
        this.startingStack = startingStack;
    }

    public long getTotalChips() {
        return totalChips;
    }

    public void setTotalChips(long totalChips) {
        this.totalChips = totalChips;
    }

    public long getAverageStack() {
        return averageStack;
    }

    public void setAverageStack(long averageStack) {
        this.averageStack = averageStack;
    }

    public List<String> getActivePlayerNames() {
        return activePlayerNames;
    }

    public void setActivePlayerNames(List<String> activePlayerNames) {
        this.activePlayerNames = activePlayerNames;
    }

    public List<String> getEliminatedPlayerNames() {
        return eliminatedPlayerNames;
    }

    public void setEliminatedPlayerNames(List<String> eliminatedPlayerNames) {
        this.eliminatedPlayerNames = eliminatedPlayerNames;
    }

    public boolean isRunning() {
        return running;
    }

    public void setRunning(boolean running) {
        this.running = running;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public static class Builder {

        private final TournamentStatusResponse response = new TournamentStatusResponse();

        public Builder tournamentName(String tournamentName) {
            response.tournamentName = tournamentName;
            return this;
        }

        public Builder currentBlind(String currentBlind) {
            response.currentBlind = currentBlind;
            return this;
        }

        public Builder currentSmallBlind(Integer currentSmallBlind) {
            response.currentSmallBlind = currentSmallBlind;
            return this;
        }

        public Builder currentBigBlind(Integer currentBigBlind) {
            response.currentBigBlind = currentBigBlind;
            return this;
        }

        public Builder currentLevelNumber(Integer currentLevelNumber) {
            response.currentLevelNumber = currentLevelNumber;
            return this;
        }

        public Builder nextItem(String nextItem) {
            response.nextItem = nextItem;
            return this;
        }

        public Builder status(String status) {
            response.status = status;
            return this;
        }

        public Builder remainingSeconds(long remainingSeconds) {
            response.remainingSeconds = remainingSeconds;
            return this;
        }

        public Builder elapsedSeconds(long elapsedSeconds) {
            response.elapsedSeconds = elapsedSeconds;
            return this;
        }

        public Builder timeToNextBreakSeconds(long timeToNextBreakSeconds) {
            response.timeToNextBreakSeconds = timeToNextBreakSeconds;
            return this;
        }

        public Builder nextPhase(String nextPhase) {
            response.nextPhase = nextPhase;
            return this;
        }

        public Builder activePlayers(int activePlayers) {
            response.activePlayers = activePlayers;
            return this;
        }

        public Builder entries(int entries) {
            response.entries = entries;
            return this;
        }

        public Builder playersLeft(int playersLeft) {
            response.playersLeft = playersLeft;
            return this;
        }

        public Builder rebuys(int rebuys) {
            response.rebuys = rebuys;
            return this;
        }

        public Builder startingStack(int startingStack) {
            response.startingStack = startingStack;
            return this;
        }

        public Builder totalChips(long totalChips) {
            response.totalChips = totalChips;
            return this;
        }

        public Builder averageStack(long averageStack) {
            response.averageStack = averageStack;
            return this;
        }

        public Builder activePlayerNames(List<String> activePlayerNames) {
            response.activePlayerNames = activePlayerNames;
            return this;
        }

        public Builder eliminatedPlayerNames(List<String> eliminatedPlayerNames) {
            response.eliminatedPlayerNames = eliminatedPlayerNames;
            return this;
        }

        public Builder running(boolean running) {
            response.running = running;
            return this;
        }

        public Builder message(String message) {
            response.message = message;
            return this;
        }

        public TournamentStatusResponse build() {
            return response;
        }
    }
}
