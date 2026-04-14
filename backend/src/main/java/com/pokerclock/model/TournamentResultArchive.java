package com.pokerclock.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "tournament_result_archives")
public class TournamentResultArchive {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String tournamentName;

    private Instant savedAt;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String payloadJson;

    public Long getId() {
        return id;
    }

    public String getTournamentName() {
        return tournamentName;
    }

    public void setTournamentName(String tournamentName) {
        this.tournamentName = tournamentName;
    }

    public Instant getSavedAt() {
        return savedAt;
    }

    public void setSavedAt(Instant savedAt) {
        this.savedAt = savedAt;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public void setPayloadJson(String payloadJson) {
        this.payloadJson = payloadJson;
    }
}
