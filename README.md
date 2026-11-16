# AI-Powered Phishing Simulation & Security Awareness Platform

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An end-to-end cybersecurity training and simulation system designed to educate employees on phishing threats and assess organizational vulnerability using generative AI and Retrieval-Augmented Generation (RAG).

Developed as part of the **Semester 3 On-the-Job Training (OJT) Project**.

---

## 🌟 Key Features

- **Generative AI Simulation**: Grounded phishing scenario generation powered by Google Gemini and ChromaDB vector retrieval (RAG).
- **Targeted Security Campaigns**: Create campaigns, assign user targets, and monitor interaction lifecycle (sent, clicked, reported, completed).
- **Interactive Security Training**: Assign awareness modules to employees based on simulation outcomes.
- **Role-Based Access Control (RBAC)**: Distinct permissions for `admin`, `manager`, and `employee`.
- **Review & Approval Workflow**: Safety and review pipeline to inspect and approve AI-generated campaigns before dispatch.
- **Detailed Audit Logging**: Comprehensive audit trail for system events, user actions, and simulation results.
- **Modern Dashboard UI**: Built with Next.js App Router, Tailwind CSS, and Lucide icons.

---

## 🏗️ Architecture

```
Ojt_project_sem3/
├── backend/
│   ├── app/
│   │   ├── api/            # API endpoints & dependency injection
│   │   ├── core/           # Security, JWT tokens, config & permissions
│   │   ├── db/             # SQLAlchemy engine, session & init
│   │   ├── models/         # Database models (User, Campaign, Simulation, Training, etc.)
│   │   ├── rag/            # LangGraph workflow, ChromaDB ingestion & retriever
│   │   ├── schemas/        # Pydantic validation schemas
│   │   └── services/       # AI generation (Gemini) & audit logging services
│   ├── main.py             # FastAPI entrypoint
│   └── requirements.txt    # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js App Router pages (Dashboard, Campaigns, Trainings, etc.)
│   │   └── lib/            # API client and helper functions
│   └── package.json        # Frontend dependencies
├── docker-compose.yml      # Local PostgreSQL container definition
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- Docker & Docker Compose (for PostgreSQL)

### 1. Database Setup

Start the PostgreSQL service using Docker Compose:

```bash
docker-compose up -d
```

### 2. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Configure your environment variables in `.env` (Gemini API key, database credentials, JWT secret).

Initialize admin user and run backend:

```bash
python create_admin.py
uvicorn main:app --reload --port 8000
```

Backend documentation will be available at: `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The web interface will be available at: `http://localhost:3000`

---

## 🛡️ Security Note

This repository is developed for educational and training purposes only. It should only be deployed in authorized enterprise environments for employee awareness training.
