package com.pokerclock.api;

public class TournamentStatusResponse {

    private String tournamentName;
    private String currentBlind;
    private long remainingSeconds;
    private String nextPhase;
    private int activePlayers;
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

    public long getRemainingSeconds() {
        return remainingSeconds;
    }

    public void setRemainingSeconds(long remainingSeconds) {
        this.remainingSeconds = remainingSeconds;
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

        public Builder remainingSeconds(long remainingSeconds) {
            response.remainingSeconds = remainingSeconds;
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
