package com.pokerclock.api;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class RegistrationTemplateResponse {

    private Long id;
    private String tournamentName;
    private String location;
    private int startingStack;
    private BigDecimal buyInEuro;
    private boolean rebuyEnabled;
    private String rebuyMode;
    private Integer rebuyMaxCount;
    private BigDecimal reentryPriceEuro;
    private Integer reentryStack;
    private int tableCount;
    private int seatsPerTable;
    private List<String> participants = new ArrayList<>();
    private List<BlindLevelRequest> blindLevels = new ArrayList<>();
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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

    public int getStartingStack() {
        return startingStack;
    }

    public void setStartingStack(int startingStack) {
        this.startingStack = startingStack;
    }

    public BigDecimal getBuyInEuro() {
        return buyInEuro;
    }

    public void setBuyInEuro(BigDecimal buyInEuro) {
        this.buyInEuro = buyInEuro;
    }

    public boolean isRebuyEnabled() {
        return rebuyEnabled;
    }

    public void setRebuyEnabled(boolean rebuyEnabled) {
        this.rebuyEnabled = rebuyEnabled;
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

    public BigDecimal getReentryPriceEuro() {
        return reentryPriceEuro;
    }

    public void setReentryPriceEuro(BigDecimal reentryPriceEuro) {
        this.reentryPriceEuro = reentryPriceEuro;
    }

    public Integer getReentryStack() {
        return reentryStack;
    }

    public void setReentryStack(Integer reentryStack) {
        this.reentryStack = reentryStack;
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

    public List<String> getParticipants() {
        return participants;
    }

    public void setParticipants(List<String> participants) {
        this.participants = participants;
    }

    public List<BlindLevelRequest> getBlindLevels() {
        return blindLevels;
    }

    public void setBlindLevels(List<BlindLevelRequest> blindLevels) {
        this.blindLevels = blindLevels;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}