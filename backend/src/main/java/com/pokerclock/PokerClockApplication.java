package com.pokerclock;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PokerClockApplication {

    public static void main(String[] args) {
        SpringApplication.run(PokerClockApplication.class, args);
    }
}
