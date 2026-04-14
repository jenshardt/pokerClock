package com.pokerclock.api;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class TournamentResultSaveRequest {

    private String tournamentName;
    private String location;
    private Integer entries;
    private Integer rebuys;
    private Integer playersLeft;
    private Long elapsedSeconds;
    private BigDecimal buyInEuro;
    private BigDecimal reentryPriceEuro;
    private BigDecimal prizePoolEuro;
    private String payoutMode;
    private String payoutValueMode;
    private List<String> participants = new ArrayList<>();
    private List<String> activePlayerNames = new ArrayList<>();
    private List<String> eliminatedPlayerNames = new ArrayList<>();
    private List<TournamentResultPayoutEntryRequest> payouts = new ArrayList<>();

    public String getTournamentName() {
        return tournamentName;
    }

    public void setTournamentName(String tournamentName) {
        this.tournamentName = tournamentName;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public Integer getEntries() {
        return entries;
    }

    public void setEntries(Integer entries) {
        this.entries = entries;
    }

    public Integer getRebuys() {
        return rebuys;
    }

    public void setRebuys(Integer rebuys) {
        this.rebuys = rebuys;
    }

    public Integer getPlayersLeft() {
        return playersLeft;
    }

    public void setPlayersLeft(Integer playersLeft) {
        this.playersLeft = playersLeft;
    }

    public Long getElapsedSeconds() {
        return elapsedSeconds;
    }

    public void setElapsedSeconds(Long elapsedSeconds) {
        this.elapsedSeconds = elapsedSeconds;
    }

    public BigDecimal getBuyInEuro() {
        return buyInEuro;
    }

    public void setBuyInEuro(BigDecimal buyInEuro) {
        this.buyInEuro = buyInEuro;
    }

    public BigDecimal getReentryPriceEuro() {
        return reentryPriceEuro;
    }

    public void setReentryPriceEuro(BigDecimal reentryPriceEuro) {
        this.reentryPriceEuro = reentryPriceEuro;
    }

    public BigDecimal getPrizePoolEuro() {
        return prizePoolEuro;
    }

    public void setPrizePoolEuro(BigDecimal prizePoolEuro) {
        this.prizePoolEuro = prizePoolEuro;
    }

    public String getPayoutMode() {
        return payoutMode;
    }

    public void setPayoutMode(String payoutMode) {
        this.payoutMode = payoutMode;
    }

    public String getPayoutValueMode() {
        return payoutValueMode;
    }

    public void setPayoutValueMode(String payoutValueMode) {
        this.payoutValueMode = payoutValueMode;
    }

    public List<String> getParticipants() {
        return participants;
    }

    public void setParticipants(List<String> participants) {
        this.participants = participants;
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

    public List<TournamentResultPayoutEntryRequest> getPayouts() {
        return payouts;
    }

    public void setPayouts(List<TournamentResultPayoutEntryRequest> payouts) {
        this.payouts = payouts;
    }
}
