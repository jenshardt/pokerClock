package com.pokerclock.api;

public class CreateTournamentResponse {

    private Long templateId;
    private String message;

    public CreateTournamentResponse() {
    }

    public CreateTournamentResponse(Long templateId, String message) {
        this.templateId = templateId;
        this.message = message;
    }

    public Long getTemplateId() {
        return templateId;
    }

    public void setTemplateId(Long templateId) {
        this.templateId = templateId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}