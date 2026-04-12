package com.pokerclock.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "registration_templates")
public class RegistrationTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
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
    private boolean hasNeutralDealer;

    @ElementCollection
    @CollectionTable(name = "registration_participants", joinColumns = @JoinColumn(name = "template_id"))
    @Column(name = "participant")
    private List<String> participants = new ArrayList<>();

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("levelOrder ASC")
    private List<RegistrationBlindLevel> blindLevels = new ArrayList<>();

    private Instant createdAt;
    private Instant updatedAt;

    public Long getId() {
        return id;
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

    public boolean isHasNeutralDealer() {
        return hasNeutralDealer;
    }

    public void setHasNeutralDealer(boolean hasNeutralDealer) {
        this.hasNeutralDealer = hasNeutralDealer;
    }

    public List<String> getParticipants() {
        return participants;
    }

    public void setParticipants(List<String> participants) {
        this.participants = participants;
    }

    public List<RegistrationBlindLevel> getBlindLevels() {
        return blindLevels;
    }

    public void setBlindLevels(List<RegistrationBlindLevel> blindLevels) {
        this.blindLevels.clear();
        for (RegistrationBlindLevel blindLevel : blindLevels) {
            blindLevel.setTemplate(this);
            this.blindLevels.add(blindLevel);
        }
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}