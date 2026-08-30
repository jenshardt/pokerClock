package com.pokerclock.model;

import java.util.Locale;

public enum UserRole {
    ADMIN,
    FLOORMAN,
    TABLE;

    public static UserRole fromConfiguration(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Eine Benutzerrolle ist erforderlich.");
        }

        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Unbekannte Benutzerrolle: " + value, exception);
        }
    }
}