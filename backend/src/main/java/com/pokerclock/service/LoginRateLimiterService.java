package com.pokerclock.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginRateLimiterService {

    public static final int MAX_ATTEMPTS = 5;
    public static final Duration REFILL_PERIOD = Duration.ofMinutes(1);

    // Striktes Limit pro Benutzername, unabhaengig von der IP (schuetzt vor verteilten Angriffen auf einen Account)
    public static final int MAX_ATTEMPTS_PER_USERNAME = 10;
    public static final Duration USERNAME_REFILL_PERIOD = Duration.ofMinutes(5);

    // Pro IP-Adresse ein eigener Bucket; kein Cleanup nötig, da die Nutzerzahl begrenzt ist
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> usernameBuckets = new ConcurrentHashMap<>();

    /**
     * Versucht, ein Token für die angegebene IP zu verbrauchen.
     *
     * @return {@code true} wenn der Request erlaubt ist, {@code false} wenn das Limit überschritten wurde
     */
    public boolean tryConsume(String ipAddress) {
        Bucket bucket = buckets.computeIfAbsent(ipAddress, ip -> newBucket());
        return bucket.tryConsume(1);
    }

    /**
     * Wie {@link #tryConsume(String)}, prüft zusätzlich ein separates Limit pro Benutzername,
     * damit ein Account nicht über viele verschiedene IPs hinweg per Brute-Force angegriffen werden kann.
     */
    public boolean tryConsume(String ipAddress, String username) {
        if (!tryConsume(ipAddress)) {
            return false;
        }
        String key = username == null ? "" : username.trim().toLowerCase();
        Bucket bucket = usernameBuckets.computeIfAbsent(key, u -> newUsernameBucket());
        return bucket.tryConsume(1);
    }

    private Bucket newBucket() {
        Bandwidth limit = Bandwidth.builder()
                .capacity(MAX_ATTEMPTS)
                .refillGreedy(MAX_ATTEMPTS, REFILL_PERIOD)
                .build();
        return Bucket.builder()
                .addLimit(limit)
                .build();
    }

    private Bucket newUsernameBucket() {
        Bandwidth limit = Bandwidth.builder()
                .capacity(MAX_ATTEMPTS_PER_USERNAME)
                .refillGreedy(MAX_ATTEMPTS_PER_USERNAME, USERNAME_REFILL_PERIOD)
                .build();
        return Bucket.builder()
                .addLimit(limit)
                .build();
    }
}
