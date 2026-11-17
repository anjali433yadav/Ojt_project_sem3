# AI-Powered Phishing Simulation & Security Awareness Platform

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue.svg)](https://www.postgresql.org/)
[![ChromaDB](https://img.shields.io/badge/Vector_DB-ChromaDB-orange.svg)](https://www.trychroma.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An end-to-end cybersecurity training and simulation system designed to educate employees on phishing threats and assess organizational vulnerability using generative AI and Retrieval-Augmented Generation (RAG).

Developed as part of the **Semester 3 On-the-Job Training (OJT) Project**.

---

## 🌟 Key Features

- **Generative AI Simulation**: Grounded phishing scenario generation powered by Google Gemini and ChromaDB vector retrieval (RAG).
- **Targeted Security Campaigns**: Create campaigns, assign employee targets, and track interaction status (assigned, opened, reported, completed).
- **Human-in-the-Loop Review Pipeline**: Safety and review interface for Security Analysts and Admins to inspect, approve, or reject simulations with mandatory feedback.
- **Interactive Security Training**: Assign awareness modules to employees based on simulation outcomes with progress tracking.
- **Role-Based Access Control (RBAC)**: Enforced across `Admin`, `Campaign Manager`, `Security Analyst`, `Auditor`, and `Employee`.
- **Immutable Audit Logging**: Comprehensive audit trail capturing user actions, simulation reviews, and employee activity.
- **Modern Dashboard UI**: Built with Next.js 15 App Router, Tailwind CSS, responsive layouts, and interactive status tabs.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend (Next.js 15 + Tailwind CSS)"]
        UI_Dash["Executive Dashboard"]
        UI_Camp["Campaign Manager"]
        UI_Review["Simulation Reviews"]
        UI_Sim["AI Generation Studio"]
        UI_Emp["Employee Portal (My Training & Simulations)"]
    end

    subgraph API["Backend (FastAPI REST API)"]
        Auth["JWT Auth & RBAC Security"]
        CampAPI["Campaign Service"]
        ReviewAPI["Review Pipeline"]
        TrainAPI["Training Service"]
        AuditAPI["Audit Logger"]
    end

    subgraph AI["GenAI & RAG Pipeline"]
        LangGraph["LangGraph State Workflow"]
        Chroma["ChromaDB Vector Store (cybersecurity_basics)"]
        Gemini["Google Gemini (gemini-2.5-flash)"]
        Safety["Content Safety & URL Validator"]
    end

    subgraph Storage["Persistence Layer"]
        PG[("PostgreSQL 17 Database")]
    end

    Client -->|HTTPS / JSON Bearer JWT| API
    API --> PG
    CampAPI --> LangGraph
    LangGraph --> Chroma
    LangGraph --> Gemini
    Gemini --> Safety
    Safety --> ReviewAPI
    ReviewAPI --> PG
```

---

## 🗄️ Database Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    ROLES ||--o{ USERS : "has"
    USERS ||--o{ CAMPAIGNS : "creates"
    USERS ||--o{ CAMPAIGN_TARGETS : "targeted_in"
    USERS ||--o{ SIMULATIONS : "creates / reviews"
    USERS ||--o{ TRAINING_ASSIGNMENTS : "assigned_to"
    USERS ||--o{ AUDIT_LOGS : "acted_by"
    
    CAMPAIGNS ||--o{ CAMPAIGN_TARGETS : "targets"
    CAMPAIGNS ||--o{ SIMULATIONS : "contains"
    
    SIMULATIONS ||--o{ CAMPAIGN_RESULTS : "evaluates"
    CAMPAIGN_TARGETS ||--o{ CAMPAIGN_RESULTS : "results_for"
    
    TRAININGS ||--o{ TRAINING_ASSIGNMENTS : "assigned_in"

    USERS {
        uuid id PK
        string full_name
        string email UK
        string password_hash
        uuid role_id FK
        boolean is_active
        timestamp created_at
    }

    ROLES {
        uuid id PK
        string name UK
        string description
    }

    CAMPAIGNS {
        uuid id PK
        string name
        text description
        string status
        uuid created_by FK
        timestamp start_date
        timestamp end_date
    }

    SIMULATIONS {
        uuid id PK
        string title
        string subject
        text content
        string category
        string difficulty
        boolean ai_generated
        string status
        uuid campaign_id FK
        uuid created_by FK
        text review_comment
        uuid reviewed_by FK
        timestamp reviewed_at
    }

    CAMPAIGN_TARGETS {
        uuid id PK
        uuid campaign_id FK
        uuid user_id FK
        string status
    }

    CAMPAIGN_RESULTS {
        uuid id PK
        uuid target_id FK
        uuid simulation_id FK
        string outcome
        text feedback
        timestamp opened_at
        timestamp reported_at
        timestamp completed_at
    }

    TRAININGS {
        uuid id PK
        string title
        text description
        text content
        string category
        boolean is_published
        uuid created_by FK
    }

    TRAINING_ASSIGNMENTS {
        uuid id PK
        uuid training_id FK
        uuid employee_id FK
        string status
        timestamp completed_at
    }

    AUDIT_LOGS {
        uuid id PK
        string action
        string entity_type
        string entity_id
        text details
        uuid actor_id FK
        timestamp created_at
    }
```

---

## 🔐 Role-Based Access Control (RBAC) Matrix

| Endpoint Group | Admin | Campaign Manager | Security Analyst | Auditor | Employee |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **User Management** (`/api/admin/users`) | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Campaign Creation** (`/api/campaigns`) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **AI Simulation Generation** (`/api/ai/generate-simulation`) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Review & Approve/Reject** (`/api/reviews`) | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Training Catalog Management** (`/api/trainings`) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Dashboard Analytics** (`/api/dashboard/*`) | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Audit Logs** (`/api/admin/audit-logs`) | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Employee Portal** (`/api/simulations/my`, `/trainings/my`) | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- Docker & Docker Compose (for PostgreSQL)

### 1. Database Setup

Start PostgreSQL using Docker Compose:

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

Configure your environment variables in `.env` (Gemini API key, PostgreSQL URL, JWT secret).

Initialize database tables and create the initial administrator:

```bash
python create_admin.py
uvicorn main:app --reload --port 8000
```

*Interactive API Docs*: `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

*Web Application*: `http://localhost:3000`

---

## 🧪 Automated Roadmap Verification Suite

The repository includes a comprehensive end-to-end regression test suite covering all 8 project roadmap areas:

```bash
cd backend
python test_roadmap_suite.py
```

### Verified Roadmap Items
1. ✅ JWT Authentication & Password Hashing
2. ✅ Multi-Role RBAC Authorization (Admin, Campaign Manager, Security Analyst, Employee)
3. ✅ Campaign Creation, Editing, and Target Assignment
4. ✅ LangGraph Multi-Agent RAG Pipeline with ChromaDB & Google Gemini
5. ✅ Content Safety & Credential Harvesting Prevention
6. ✅ Human-in-the-Loop Review Pipeline (Approve, Reject with Comments, Status Queries)
7. ✅ Employee Interaction Lifecycle (Assigned, Opened, Reported, Completed)
8. ✅ Training Creation, Publishing, Assignment, and Completion
9. ✅ Platform Overview, Campaign Analytics, and Training Analytics
10. ✅ Immutable System Audit Trail

---

## 🛡️ Responsible Disclosure Note

This platform is strictly designed for educational, organizational training, and research purposes. All generated simulations enforce fictional pretexts, safe placeholders (`[SIMULATED TRAINING LINK - DO NOT OPEN]`), and strict credential-collection prevention.
