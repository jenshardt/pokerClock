package com.pokerclock.api;

import java.math.BigDecimal;

public record TournamentPayoutSummaryEntry(
        Integer place,
        String label,
        String playerName,
        BigDecimal percent,
        BigDecimal amountEuro
) {
}