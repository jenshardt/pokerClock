package com.pokerclock.model;

import jakarta.persistence.*;

@Entity
@Table(name = "registration_blind_levels")
public class RegistrationBlindLevel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int levelOrder;
    private int smallBlind;
    private int bigBlind;
    private int durationMinutes;
    private Integer breakMinutes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private RegistrationTemplate template;

    public Long getId() {
        return id;
    }

    public int getLevelOrder() {
        return levelOrder;
    }

    public void setLevelOrder(int levelOrder) {
        this.levelOrder = levelOrder;
    }

    public int getSmallBlind() {
        return smallBlind;
    }

    public void setSmallBlind(int smallBlind) {
        this.smallBlind = smallBlind;
    }

    public int getBigBlind() {
        return bigBlind;
    }

    public void setBigBlind(int bigBlind) {
        this.bigBlind = bigBlind;
    }

    public int getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(int durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public Integer getBreakMinutes() {
        return breakMinutes;
    }

    public void setBreakMinutes(Integer breakMinutes) {
        this.breakMinutes = breakMinutes;
    }

    public RegistrationTemplate getTemplate() {
        return template;
    }

    public void setTemplate(RegistrationTemplate template) {
        this.template = template;
    }
}