package com.pokerclock.api;

import java.time.Instant;

public class TournamentResultSaveResponse {

    private Long id;
    private Instant savedAt;
    private String message;

    public TournamentResultSaveResponse() {
    }

    public TournamentResultSaveResponse(Long id, Instant savedAt, String message) {
        this.id = id;
        this.savedAt = savedAt;
        this.message = message;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Instant getSavedAt() {
        return savedAt;
    }

    public void setSavedAt(Instant savedAt) {
        this.savedAt = savedAt;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
