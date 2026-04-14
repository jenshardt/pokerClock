# PokerClock – Pokerturniere digital organisieren

Eine auf **Spring Boot** + **React** basierende Webanwendung zur digitalen Vorbereitung, Durchführung und Verwaltung von Pokerturnieren mit Live-Tischverteilung, automatischen Blindstruktur-Verwaltung und Ergebnisregistrierung.

---

## 📋 Inhaltsverzeichnis

1. [Architektur](#architektur)
2. [Technologie-Stack](#technologie-stack)
3. [Projekt-Struktur](#projekt-struktur)
4. [Build & Entwicklung](#build--entwicklung)
5. [Docker: Build, Deploy & Start](#docker-build-deploy--start)
6. [Screenshots der Anwendung](#screenshots-der-anwendung)
7. [Funktionen & Features](#funktionen--features)
8. [Beiträge & Änderungswünsche](#beiträge--änderungswünsche)
9. [Lizenz](#lizenz)
10. [Haftungsausschluss](#haftungsausschluss)

---

## 🏗️ Architektur

PokerClock folgt einer klassischen **Client-Server-Architektur**:

### Backend (Spring Boot 4)
- **REST-API** für Turnierverwaltung, Authentifizierung und Echtzeit-Status
- **PostgreSQL-Datenbank** für persistente Speicherung (Registrierungsvorlagen, Turniere, Ergebnisse)
- **JPA/Hibernate** für Datenzugriff und Entitätsverwaltung
- Endpoints:
  - `/api/auth/` – Login, Logout, Authentifizierung
  - `/api/registration/templates/` – Registrierungsvorlagen (CRUD, Import/Export)
  - `/api/` – Turnier-Setup, Status, Aktionen (Start, Pause, Resume, End)
  - `/api/results` – Optionale Speicherung von Turnierergebnissen

### Frontend (React 18 + Vite)
- **React-Komponenten** für alle Phasen (Authentifizierung, Registrierung, Tischverteilung, Turnier, Ergebnisse)
- **Vite** als Build-Tool und Dev-Server
- **CSS Modules** für Styling
- ✓ Responsive Design für Desktop und Tablet

### Persistenz & Datenbank
- **PostgreSQL** läuft im Docker Container
- Automatische Schemamigrationen via Flyway/Hibernate
- Volumes für Datenpersistenz über Container-Restarts

### Authentifizierung
- **Session-basiert** mit Token-Header (`X-Auth-Token`)
- Benutzer in PostgreSQL verwaltet

---

## 🛠️ Technologie-Stack

| Komponente | Technologie | Version |
|------------|-------------|---------|
| Backend | Spring Boot | 4.0.5 |
| Language (Backend) | Java | 25 |
| Language (Frontend) | JavaScript (React) | ES2020+ |
| Database | PostgreSQL | - |
| Build (Frontend) | Vite | 5.4 |
| Container | Docker & Docker Compose | - |
| ORM | JPA/Hibernate | - |

---

## 📁 Projekt-Struktur

```
PokerClock/
├── backend/
│   ├── src/main/java/com/pokerclock/
│   │   ├── api/                    # REST DTOs (Request/Response)
│   │   ├── controller/             # REST Endpoints
│   │   ├── model/                  # JPA Entities
│   │   ├── repository/             # Data Access Layer (JPA)
│   │   ├── service/                # Business Logic
│   │   └── config/                 # Spring Config (Security, Web, DB)
│   ├── pom.xml                     # Maven Dependencies
│   └── Dockerfile                  # Container für Backend
│
├── frontend/
│   ├── src/
│   │   ├── pages/                  # Page Components (Login, Turnier, etc.)
│   │   ├── components/             # Reusable Components
│   │   ├── api.js                  # API-Client
│   │   ├── App.jsx                 # Root Component
│   │   └── index.css               # Global Styles
│   ├── package.json                # NPM Dependencies
│   ├── vite.config.js              # Vite Config
│   └── Dockerfile                  # Container für Frontend
│
├── docker-compose.yml              # Orchestration (Backend, Frontend, DB)
└── README.md                       # Diese Datei
```

---

## 🔨 Build & Entwicklung

### Voraussetzungen
- **Node.js** 18+ (für Frontend)
- **Java 25** (für Backend)
- **Maven 3.8+** (für Backend)
- Optional: **Docker Desktop** (für containerisierte Entwicklung)

### Entwicklung (lokal)

#### 1. Backend starten
```bash
cd backend
mvn spring-boot:run
```
✓ Backend verfügbar unter `http://localhost:8080`

#### 2. Frontend starten (in neuem Terminal)
```bash
cd frontend
npm install
npm run dev
```
✓ Frontend verfügbar unter `http://localhost:5173` (oder wie in der Konsole angezeigt)

### Build für Production

#### Frontend bauen
```bash
cd frontend
npm install
npm run build
# Output: dist/
```

#### Backend bauen
```bash
cd backend
mvn clean package -DskipTests
# Output: target/pokerclock-backend-0.0.1-SNAPSHOT.jar
```

---

## 🐳 Docker: Build, Deploy & Start

### Mit Docker Desktop UI (einfachste Methode)

1. **Docker Desktop starten** (falls nicht bereits laufend)

2. **Im Projektstamm das Docker Compose File öffnen:**
   ```bash
   # Terminal im Root-Verzeichnis (wo docker-compose.yml liegt)
   docker compose up --build
   ```

3. **In der Docker Desktop UI beobachten:**
   - Öffne Docker Desktop App
   - Gehe zu **Containers**
   - Du siehst Logs und Status der Container (pokerclock-backend, pokerclock-frontend, db)

4. **Application testen:**
   - Frontend: `http://localhost:3000`
   - Backend Status: `http://localhost:8080/actuator/health`

5. **Stack stoppen:**
   ```bash
   docker compose down
   ```

### Stack-Details (docker-compose.yml)

| Service | Port | Beschreibung |
|---------|------|-------------|
| `frontend` | 3000 | React App (Nginx) |
| `backend` | 8080 | Spring Boot REST API |
| `db` | 5432 | PostgreSQL (nicht von außen sichtbar) |

### Volumes & Persistenz
- `db_data` – PostgreSQL Daten (persistent über Restarts)
- Automatische Datenbank-Initialisierung beim ersten Start

### Logs in Docker Desktop
- Klick auf einen Service → **Logs** Tab → Echtzeit-Ausgabe

---

## 📸 Screenshots der Anwendung

### 1. Login Screen
![Login Screen](./docs/images/Login_Screen.png)

**Beschreibung:**
- Authentifizierung mit Benutzername und Passwort
- Session-Token wird nach Login gespeichert
- Fehlerbehandlung bei falschen Credentials

### 2. Turniervorbereitung (Registrierung & Blindstruktur)
![Turniervorbereitung Screen](./docs/images/Tuniervorbereitung_Screen.png)

**Beschreibung:**
- **Turnierdaten:** Name, Standort, Starting Stack
- **Finanzielle Parameter:** Buy-in in EUR, Rebuy-Optionen mit Preisen
- **Teilnehmer:** Liste der Spieler (kommagetrennt oder zeilenweise)
- **Blindstruktur-Editor:**
  - Levels mit Small Blind / Big Blind
  - Pause-Einträge
  - Drag & Drop zum Reordern
  - Standardstruktur verfügbar
- **Speichern & Importieren:** JSON-Export und -Import von Vorlagen

### 3. Tischverteilung (Preparation Phase)
![Tischverteilung Screen](./docs/images/Tischverteilung_Sceeen.png)

**Beschreibung:**
- Visuelle Darstellung der Tischverteilung
- Alle Spieler sind zugeordnet
- Dealer- und Blinds-Positionen sind markiert
- Button zum Starten des Turniers
- Möglichkeit, zur Konfiguration zurückzukehren

### 4. Turnier im Betrieb (Running Tournament)
![Turnier Screen](./docs/images/Tunier_Screen.png)

**Beschreibung:**
- **Live Clock:** Countdown für aktuelle Blindstufe
- **Current Blinds:** SB/BB-Werte und nächste Stufe
- **Spieler-Statistiken:** Entries, Players Left, Average Stack, Total Chips
- **Rebuys:** Gezählte Rebuys während des Turniers
- **Tischplan:** Alle aktiven Spieler mit Live-Anzeige
- **Kontrollbuttons:** Pause, Resume, End Tournament

### 5. Spieler-Aktionen (Seat Open / Rebuy)
![Turnier SeatOpen Detail](./docs/images/Tunier_SeatOpen.png)

**Beschreibung:**
- Klick auf einen Spieler öffnet diese Detailansicht
- **Seat Open:** Spieler als ausgeschieden markieren
- **Rebuy:** Spieler mit neuem Stack zurück ins Spiel nehmen
- Daten werden in Echtzeit aktualisiert

### 6. Turnier-Zusammenfassung & Ergebnisse
Nach dem Klick auf „Turnier beenden":
- **Bestätigungsdialog** in der App (kein Browser-Popup)
- **Summary Modal** mit:
  - Turnier-Statistiken (Dauer, Einträge, Rebuys, Spieler übrig)
  - **Preispool-Berechnung:** Buy-in × Entries + Rebuy × Rebuys
  - **Auszahlungs-Presets:** 60/40, 50/30/20, oder Custom Top-N
  - **Deal-Modus:** Spielerbasierte Verteilung (ICM-Deals)
  - **Eingabe-Modi:** Prozent oder Betrag
  - **Spieler-Auswahl:** Automatische Vorschläge nach Ausscheidungsreihenfolge
  - **Optionales Speichern:** Ergebnis im Backend persistieren

---

## ✨ Funktionen & Features

### Phase 1: Turnierkonfiguration
- ✓ Mehrstufige Registrierung mit gruppierten Eingaben
- ✓ Flexibles Rebuy-System (ONE_PER_PLAYER, N_WHILE_ELIGIBLE, etc.)
- ✓ Blindstruktur-Editor (Levels + Breaks)
- ✓ Speichern von Registrierungsvorlagen in PostgreSQL
- ✓ JSON-Import/Export für Turniervorlagen
- ✓ Validierung und Fehlerbehandlung

### Phase 2: Tischverteilung & Vorbereitung
- ✓ Automatische zufällige Tischverteilung
- ✓ Dealer & Blinds-Positionen
- ✓ Optionale Neutral-Dealer-Regel
- ✓ Visuelle Vorschau vor Turnierbeginn

### Phase 3: Live Tournament
- ✓ Echtzeit-Blind-Countdown
- ✓ Aktuelle Blindstufe anzeigen
- ✓ Spielerjlist (aktiv / ausgeschieden)
- ✓ Rebuy registrieren
- ✓ Spieler als Seat Open markieren
- ✓ Pause / Resume / End Tournament

### Phase 4: Ergebnisse & Auszahlung
- ✓ Summary mit Turnier-Statistiken
- ✓ Automatische Preispool-Berechnung
- ✓ Auszahlungs-Presets (60/40, 50/30/20, Top-N-dynamisch)
- ✓ Custom-Verteilung (Prozent oder Betrag)
- ✓ Deal-Modus mit Spieler-Auswahl
- ✓ Automatische Platz-Vorschläge nach Ausscheidungsreihenfolge
- ✓ Validierung von Prozent/Betrag-Summen
- ✓ Optionales Speichern von Ergebnis & Konfiguration im Backend

### Zusatzfeatures
- ✓ Authentifizierung & Session-Management
- ✓ Responsives Design (Desktop, Tablet)
- ✓ Sound-Einstellungen (Blind-Ansagen, Fanfaren)
- ✓ Dark Mode Theme
- ✓ Error-Messages & User Feedback
- ✓ Persistent Login (Token in localStorage)

---

## 🚀 Getting Started Schnellübersicht

### 1. **Lokal entwickeln (Schnellste Variante)**
```bash
# Terminal 1: Backend
cd backend && mvn spring-boot:run

# Terminal 2: Frontend
cd frontend && npm run dev
```
→ Öffne `http://localhost:5173`

### 2. **Mit Docker Compose (Production-Like)**
```bash
docker compose up --build
```
→ Öffne `http://localhost:3000`
→ Logs in Docker Desktop UI

### 3. **Build für Production**
```bash
# Frontend
cd frontend && npm run build

# Backend
cd backend && mvn clean package -DskipTests

```

---

## Beiträge & Änderungswünsche

Dieses Repository ist **öffentlich**. Damit gilt aktuell:
- Die Anwendung kann angesehen und geklont werden.
- Forks des Repositories sind erlaubt.
- Direkte Änderungen am Original-Repository sind nur durch den Repository-Eigentümer möglich.
- Externe Beiträge sollen als **GitHub Issue** dokumentiert werden.

### Gewünschter Weg für Änderungen

Wenn du einen Fehler melden oder eine Änderung vorschlagen möchtest, nutze bitte den Bereich **Issues** im GitHub-Repository.

Verwendet werden dafür aktuell diese Vorlagen:
- **Bug Report** für Fehler, Fehlverhalten und technische Probleme
- **Feature Request** für neue Funktionen, UX-Ideen oder Änderungswünsche

### So sollen Änderungswünsche dokumentiert werden

Ein gutes Issue enthält nach Möglichkeit:
- eine kurze, präzise Überschrift
- eine Beschreibung des aktuellen Verhaltens
- eine Beschreibung des gewünschten Verhaltens
- Schritte zur Reproduktion, falls es sich um einen Fehler handelt
- Screenshots oder Kontextinformationen, falls hilfreich

### Hinweise zum Zugriffsmodell

Das Repository ist bewusst so konfiguriert, dass andere Personen:
- das Projekt lesen können
- das Projekt lokal klonen können
- eigene Forks anlegen können
- Issues anlegen können

Direkte Pushes auf das Original-Repository sind jedoch nicht vorgesehen.

Pull Requests aus Forks sind technisch grundsätzlich möglich, der bevorzugte Weg für Vorschläge und Änderungsanfragen ist in diesem Projekt jedoch weiterhin ein **Issue**.

---

## Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Die vollständigen Lizenzbedingungen findest du in [LICENSE](./LICENSE).

Die MIT-Lizenz erlaubt insbesondere:
- Nutzung der Software
- Kopieren und Weitergabe
- Anpassung und Erweiterung
- Veröffentlichung und Weitervertrieb

Dabei muss der Lizenzhinweis erhalten bleiben.

---

## Haftungsausschluss

Diese Software wird ohne ausdrückliche oder stillschweigende Gewährleistung bereitgestellt. Die Nutzung erfolgt auf eigene Verantwortung.

Es wird keine Garantie dafür übernommen, dass die Anwendung fehlerfrei funktioniert, für einen bestimmten Zweck geeignet ist oder keine Schäden, Fehlfunktionen, Datenverluste oder sonstige Probleme verursacht.

Die Haftung richtet sich im Übrigen nach den Regelungen der MIT-Lizenz.
