# PokerClock Webanwendung

Dies ist ein Startprojekt für eine `Spring Boot` + `React` Webanwendung zur Organisation und Steuerung eines Pokerturniers.

## Struktur

- `backend/` – Spring Boot REST-Backend
- `frontend/` – React-Frontend mit Vite
- `docker-compose.yml` – Container für Backend und Frontend

## Schnellstart lokal

### Backend starten

1. Öffne ein Terminal im Ordner `backend`
2. Führe aus:
   ```bash
   mvn spring-boot:run
   ```
3. Backend ist erreichbar unter `http://localhost:8080`

### Frontend starten

1. Öffne ein Terminal im Ordner `frontend`
2. Führe aus:
   ```bash
   npm install
   npm run dev
   ```
3. Frontend ist erreichbar unter `http://localhost:5173` (oder dem in der Konsole angezeigten Port)

## Start mit Docker

1. Stelle sicher, dass Docker Desktop läuft
2. Führe im Projektstamm aus:
   ```bash
   docker compose up --build
   ```
3. Öffne die Webseite unter `http://localhost:3000`

## Funktionen der Demo

- Einfache Turnierkonfiguration per Formular
- Start des Turniers mit Statusanzeige
- Abruf aktueller Blindstufe, verbleibende Zeit und Spielerzahl
- Grundlegendes Backend mit REST-API und In-Memory-Status
