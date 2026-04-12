package com.pokerclock.repository;

import com.pokerclock.model.RegistrationTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RegistrationTemplateRepository extends JpaRepository<RegistrationTemplate, Long> {
    Optional<RegistrationTemplate> findTopByOrderByUpdatedAtDesc();
}