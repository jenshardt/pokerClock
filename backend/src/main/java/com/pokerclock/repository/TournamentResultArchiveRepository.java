package com.pokerclock.repository;

import com.pokerclock.model.TournamentResultArchive;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TournamentResultArchiveRepository extends JpaRepository<TournamentResultArchive, Long> {
}
