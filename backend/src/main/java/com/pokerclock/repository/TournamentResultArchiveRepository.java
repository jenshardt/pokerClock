package com.pokerclock.repository;

import com.pokerclock.model.TournamentResultArchive;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TournamentResultArchiveRepository extends JpaRepository<TournamentResultArchive, Long> {
	Optional<TournamentResultArchive> findTopByTournamentIdOrderBySavedAtDesc(Long tournamentId);
}
