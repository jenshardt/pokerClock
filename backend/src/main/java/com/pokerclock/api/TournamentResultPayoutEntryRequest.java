package com.pokerclock.api;

import java.math.BigDecimal;

public class TournamentResultPayoutEntryRequest {

    private Integer place;
    private String label;
    private String playerName;
    private BigDecimal percent;
    private BigDecimal amountEuro;

    public Integer getPlace() {
        return place;
    }

    public void setPlace(Integer place) {
        this.place = place;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getPlayerName() {
        return playerName;
    }

    public void setPlayerName(String playerName) {
        this.playerName = playerName;
    }

    public BigDecimal getPercent() {
        return percent;
    }

    public void setPercent(BigDecimal percent) {
        this.percent = percent;
    }

    public BigDecimal getAmountEuro() {
        return amountEuro;
    }

    public void setAmountEuro(BigDecimal amountEuro) {
        this.amountEuro = amountEuro;
    }
}
