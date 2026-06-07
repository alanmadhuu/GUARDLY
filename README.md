# Guardly 🛡️

## Overview

Guardly is an AI-powered travel safety platform designed to help tourists avoid common scams, overcharging, and route manipulation while traveling.

The platform combines route monitoring, intelligent fare analysis, location-based scam alerts, and AI-generated safety recommendations to help travelers make safer decisions and avoid financial loss.

---

## Problem Statement

Tourists often face challenges when visiting unfamiliar locations, including:

* Taxi and auto-rickshaw overcharging
* Route deviation scams
* Fake guides and ticket scams
* Lack of awareness of local pricing
* Limited knowledge of high-risk tourist areas

Most existing travel applications focus on navigation or bookings but do not actively protect travelers from scams in real time.

---

## Solution

Guardly acts as a personal travel safety assistant.

The platform:

* Detects potential overcharging by comparing quoted prices against local pricing intelligence
* Monitors travel routes and identifies suspicious deviations from optimal routes
* Warns tourists about known scam hotspots before they encounter them
* Uses AI to explain risks and recommend actions
* Provides local safety insights in a simple, actionable format

By combining location intelligence, mapping, and AI-powered recommendations, Guardly helps tourists travel more safely and confidently.

---

## Features

### 🚕 GuardFare™

* Fair price estimation
* Overcharge detection
* Counter-offer recommendation
* Money saved calculation

### 🗺️ GuardRoute™

* Route deviation detection
* Distance analysis
* Risk assessment
* Interactive route visualization

### ⚠️ GuardAlerts™

* Location-based scam warnings
* Risk scoring
* Safety recommendations

### 🤖 GuardAI™

* AI-generated explanations
* Travel guidance
* Safety recommendations

### 📊 GuardScore™

* Unified safety score
* Risk classification
* Travel confidence indicator

---

## Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Google Maps JavaScript API

### Backend

* FastAPI
* Python

### Database

* JSON-based local datasets
* Scam hotspot dataset
* Local pricing intelligence dataset

### AI Layer

* LangGraph
* Groq API (Llama 3.3 70B)

### APIs

* Google Maps JavaScript API
* Google Directions API
* Google Places API
* Groq API

### Hosting

* Frontend: Vercel (planned)
* Backend: Render / Railway (planned)

---

## Local Development Setup

### Prerequisites

Install:

* Python 3.12
* Node.js 18+
* npm
* Google Maps API Key
* Groq API Key

---

## Backend Setup

From the project root:

```powershell
cd C:\Users\alanm\Documents\Codex\2026-06-06\you-are-helping-build-tourist-shield
```

Navigate to backend:

```powershell
cd backend
```

Install dependencies:

```powershell
.\.python312\python.exe -m pip install -r requirements.txt
```

Create or update:

```text
backend\.env
```

Add:

```env
GROQ_API_KEY=your_groq_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
DEMO_MODE=true
```

Start backend:

```powershell
.\run_backend.ps1
```

Backend runs at:

```text
http://127.0.0.1:8000
```

Health check:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/health
```

---

## Frontend Setup

Open a new terminal:

```powershell
cd C:\Users\alanm\Documents\Codex\2026-06-06\you-are-helping-build-tourist-shield\frontend
```

Install dependencies:

```powershell
npm install
```

Create or update:

```text
frontend\.env
```

Add:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

Start frontend:

```powershell
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

⚠️ Important:

Use:

```text
http://localhost:5173
```

instead of:

```text
http://127.0.0.1:5173
```

to allow browser location permissions and geolocation APIs to work correctly.

---

## Running the Application

### Terminal 1

```powershell
cd backend
.\run_backend.ps1
```

### Terminal 2

```powershell
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

---

## Codex / OpenAI Usage

AI development tools played a major role throughout the project lifecycle.

### Ideation

* Brainstormed travel safety use cases
* Refined the problem statement
* Designed the feature roadmap

### Architecture Planning

* Designed FastAPI backend architecture
* Planned LangGraph multi-agent workflows
* Structured frontend-backend communication

### Code Generation

* Generated backend API endpoints
* Built React frontend components
* Implemented route monitoring workflows
* Assisted with AI service integration

### Debugging

* Diagnosed API integration issues
* Fixed frontend-backend communication problems
* Resolved dependency and environment setup issues

### Testing

* Generated test cases
* Created route deviation scenarios
* Built demo datasets

### Documentation

* Generated README documentation
* Created setup instructions
* Produced architecture documentation

### API Integration

* Assisted with Google Maps integration
* Assisted with Groq API integration
* Designed scalable AI service architecture

---

## Demo

Demo Video:

https://drive.google.com/file/d/1NLv6jRVPAd04oKmqjAg01ztiMFX8R-bd/view?usp=sharing


---

## Screenshots

### Home Dashboard

<img width="1920" height="2550" alt="screencapture-127-0-0-1-5173-2026-06-07-06_53_53" src="https://github.com/user-attachments/assets/74060c8c-09f7-4955-ad1e-55d006de5a37" />



### Tourist Map

<img width="1920" height="1461" alt="screencapture-127-0-0-1-5173-2026-06-07-06_54_11" src="https://github.com/user-attachments/assets/34a81ac6-4ade-4df3-85c8-a38c255a238d" />


### Price Checker

<img width="1920" height="927" alt="screencapture-127-0-0-1-5173-2026-06-07-06_54_41" src="https://github.com/user-attachments/assets/3a39334b-a941-4b8b-8cf3-59233b9d5dfc" />


### Route Monitor

<img width="1920" height="1983" alt="screencapture-127-0-0-1-5173-2026-06-07-06_55_15" src="https://github.com/user-attachments/assets/70ec581c-d309-416e-b47d-e3eeb791f247" />


### Fare Optimizer

<img width="1920" height="2922" alt="screencapture-127-0-0-1-5173-2026-06-07-06_56_03" src="https://github.com/user-attachments/assets/74e73748-b7fc-40fd-afa0-aed83150dd60" />


---

## Future Enhancements

* Live GPS monitoring
* Community-reported scam intelligence
* Multi-language support
* Ride-hailing fare comparison
* Emergency contact integration
* Offline travel safety mode
* Crowdsourced scam verification network

---

## Impact

Guardly aims to make travel safer by helping tourists identify scams before they become victims.

By combining AI, location intelligence, and real-time safety analysis, Guardly empowers travelers with the information they need to make smarter and safer decisions.
