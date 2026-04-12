# PokerClock Webanwendung

Dies ist eine auf `Spring Boot` + `React` basierende Webanwendung zur Organisation und Steuerung eines Pokerturniers

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

### Backend und Frontend zusammen starten

Im Projektstamm kannst du das vorbereitete Startscript ausführen:

- PowerShell: `./start-all.ps1`
- Windows-Batch: `start-all.bat`

Das Script öffnet zwei PowerShell-Fenster und startet das Backend sowie das Frontend automatisch.

## Start mit Docker

1. Stelle sicher, dass Docker Desktop läuft
2. Führe im Projektstamm aus:
   ```bash
   docker compose up --build
   ```
3. Stoppe den Stack mit:
   ```bash
   docker compose down
   ```
4. Erreichbare URLs:
   - Frontend: `http://localhost:3000`
   - Backend-API: `http://localhost:8080/api/status`
   - Healthcheck: `http://localhost:8080/actuator/health`

### Persistenz und Healthcheck

- Das Backend nutzt jetzt PostgreSQL als persistente Datenbank.
- Der Datenbank-Service heißt `db` und speichert Daten im Volume `db_data`.
- Healthchecks sind aktiviert: `http://localhost:8080/actuator/health`

## Funktionen der Demo

- Mehrstufige Registrierungsphase mit gruppierten Eingaben
- Rebuy-Regeln inkl. Reentry Price und Reentry Stack
- Blindstruktur-Editor mit Standardstufen 25/50, 50/100, 100/200, 200/400
- Persistenz der Registrierungsvorlage in PostgreSQL
- JSON-Import und JSON-Export für Turniervorlagen
- Button "Turnier anlegen" zur Übergabe in die Vorbereitungsphase (Tischverteilung)
- Start des Turniers mit Statusanzeige (Blindstufe, Zeit, Teilnehmer)
