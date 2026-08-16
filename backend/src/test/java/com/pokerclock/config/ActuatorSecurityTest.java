package com.pokerclock.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalManagementPort;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ActuatorSecurityTest {

    @LocalManagementPort
    private int managementPort;

    @LocalServerPort
    private int appPort;

    private final HttpClient http = HttpClient.newHttpClient();

    @Test
    void healthEndpointShouldBeReachableOnManagementPort() throws Exception {
        HttpResponse<String> response = http.send(
                HttpRequest.newBuilder()
                        .uri(URI.create("http://localhost:" + managementPort + "/actuator/health"))
                        .GET().build(),
                HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode()).isEqualTo(200);
    }

    @Test
    void healthEndpointShouldNotRevealComponentDetailsWithoutAuth() throws Exception {
        HttpResponse<String> response = http.send(
                HttpRequest.newBuilder()
                        .uri(URI.create("http://localhost:" + managementPort + "/actuator/health"))
                        .GET().build(),
                HttpResponse.BodyHandlers.ofString());

        String body = response.body();
        assertThat(body).contains("\"status\"");
        // Ohne Authentifizierung dürfen keine Komponenten-Details (z.B. DB-Status) sichtbar sein
        assertThat(body).doesNotContain("\"components\"");
        assertThat(body).doesNotContain("\"db\"");
    }

    @Test
    void healthEndpointShouldNotBeReachableOnApplicationPort() throws Exception {
        HttpResponse<String> response = http.send(
                HttpRequest.newBuilder()
                        .uri(URI.create("http://localhost:" + appPort + "/actuator/health"))
                        .GET().build(),
                HttpResponse.BodyHandlers.ofString());

        // Der Actuator ist auf dem App-Port nicht erreichbar (404)
        assertThat(response.statusCode()).isEqualTo(404);
    }
}
