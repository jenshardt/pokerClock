package com.pokerclock.repository;

import com.pokerclock.model.Tournament;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TournamentRepository extends JpaRepository<Tournament, Long> {
    Optional<Tournament> findTopByOrderByCreatedAtDesc();
    Optional<Tournament> findTopByRunningTrueOrderByCreatedAtDesc();
}
