import uuid 
from os import error

import bcrypt
from fastapi import FastAPI
from sqlalchemy import text
from uuid import UUID
from fastapi.middleware.cors import CORSMiddleware

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from sqlalchemy import func
from sqlalchemy import and_

from app.db.dependencies import get_db
from app.models.user import User
from app.models.role import Role
from app.schemas.auth import UserRegister
from app.schemas.auth import AdminUserCreate
from app.core.security import hash_password
from app.models.audit_log import AuditLog
from app.services.audit_service import create_audit_log

from app.schemas.auth import UserLogin
from app.core.security import verify_password, create_access_token
from app.api.dependencies import get_current_user
from app.core.permissions import require_roles

from app.schemas.auth import AdminRoleUpdate, AdminUserStatusUpdate
from app.models.campaign import Campaign, CampaignStatus
from app.schemas.campaign import CampaignCreate, CampaignUpdate
from app.models.campaign_result import CampaignResult, ResultOutcome
from app.schemas.simulation import SimulationReportRequest

from app.models.campaign_target import CampaignTarget, TargetStatus
from app.models.simulation import Simulation, SimulationStatus
from app.schemas.campaign_target import CampaignTargetAssign
from app.schemas.simulation import SimulationCreate

from app.schemas.ai import SimulationGenerationRequest
from app.schemas.ai import SaveAIDraftRequest
from app.schemas.review import SimulationReviewRequest
from app.services.gemini_service import generate_simulation_content
from app.rag.workflow import build_simulation_workflow


from app.models.training import Training
from app.models.training_assignment import (
    TrainingAssignment,
    TrainingAssignmentStatus
)

from app.schemas.training import (
    TrainingCreate,
    TrainingPublishRequest,
    TrainingAssignRequest
)

from app.models.campaign_result import CampaignResult, ResultOutcome
from app.schemas.simulation import SimulationContentUpdate

app = FastAPI(
    title="AI Phishing Simulation Platform",
    description="Backend API for cybersecurity awareness training",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "message": "Welcome to AI Phishing Simulation Platform",
        "status": "Backend is running"
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "application": "Phishing Simulation Platform",
        "backend": "FastAPI"
    }

@app.get("/api/db-check")
def database_check(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT 1")).scalar()

    return {
        "message": "Database connected successfully!",
        "database_response": result
    }


@app.post("/api/auth/register", status_code=201)
def register_user(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    # 1. Check if email already exists
    existing_user = db.query(User).filter(
        User.email == user_data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )

    # 2. Check password byte length for bcrypt
    if len(user_data.password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=422,
            detail="Password must not exceed 72 UTF-8 bytes"
        )

    # 3. Find or create the Employee role
    employee_role = db.query(Role).filter(
        Role.name == "Employee"
    ).first()

    if not employee_role:
        employee_role = Role(
            name="Employee",
            description="Regular platform employee"
        )
        db.add(employee_role)
        db.flush()

    # 4. Hash the password
    password_hash = hash_password(user_data.password)

    # 5. Create the user
    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=password_hash,
        role_id=employee_role.id,
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 6. Return safe user information
    return {
        "message": "Registration successful!",
        "user": {
            "id": str(new_user.id),
            "full_name": new_user.full_name,
            "email": new_user.email,
            "role": employee_role.name,
            "is_active": new_user.is_active
        }
    }


@app.post("/api/auth/login")
def login_user(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    # 1. Find user by email
    user = db.query(User).filter(
        User.email == login_data.email
    ).first()

    # 2. Check user and password
    if not user or not verify_password(
        login_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # 3. Check whether account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is inactive"
        )

    # 4. Generate JWT
    access_token = create_access_token(str(user.id))

    # 5. Return token
    return {
        "message": "Login successful!",
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 1800
    }


@app.get("/api/auth/me")
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return {
        "id": str(current_user.id),
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role.name,
        "is_active": current_user.is_active
    }

@app.get("/api/admin/check")
def admin_check(
    current_user: User = Depends(require_roles("Admin"))
):
    return {
        "message": "Welcome Admin! Access granted.",
        "user": current_user.full_name
    }


@app.post("/api/admin/users")
def create_user_by_admin(
    user_data: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Admin"))
):
    # Only these five roles are allowed
    allowed_roles = {
        "Admin",
        "Campaign Manager",
        "Security Analyst",
        "Auditor",
        "Employee"
    }

    if user_data.role not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail="Invalid role selected."
        )

    # Check whether email already exists
    existing_user = db.query(User).filter(
        User.email == user_data.email.lower()
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email already registered."
        )

    # Find the requested role
    role = db.query(Role).filter(
        Role.name == user_data.role
    ).first()

    # Create the role if it does not exist
    if not role:
        role = Role(name=user_data.role)
        db.add(role)
        db.flush()

    # Create the new user
    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email.lower(),
        password_hash=hash_password(user_data.password),
        role_id=role.id,
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User created successfully!",
        "user": {
            "id": str(new_user.id),
            "full_name": new_user.full_name,
            "email": new_user.email,
            "role": role.name,
            "is_active": new_user.is_active
        }
    }


@app.get("/api/admin/users")
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Admin"))
):
    users = db.query(User).all()

    return {
        "total_users": len(users),
        "users": [
            {
                "id": str(user.id),
                "full_name": user.full_name,
                "email": user.email,
                "role": user.role.name,
                "is_active": user.is_active
            }
            for user in users
        ]
    }


# CHANGE USER ROLE
@app.patch("/api/admin/users/{user_id}/role")
def update_user_role(
    user_id: UUID,
    data: AdminRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Admin"))
):
    allowed_roles = {
        "Admin",
        "Campaign Manager",
        "Security Analyst",
        "Auditor",
        "Employee"
    }

    if data.role not in allowed_roles:
        raise HTTPException(400, "Invalid role")

    if user_id == current_user.id:
        raise HTTPException(400, "You cannot change your own role")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(404, "User not found")

    if user.is_active and user.role.name == "Admin" and data.role != "Admin":
        active_admins = db.query(User).join(Role).filter(
            Role.name == "Admin",
            User.is_active == True
        ).count()

        if active_admins <= 1:
            raise HTTPException(400, "Cannot remove the last active Admin")

    role = db.query(Role).filter(Role.name == data.role).first()

    if not role:
        role = Role(name=data.role)
        db.add(role)
        db.flush()

    user.role_id = role.id
    db.commit()

    return {
        "message": "User role updated successfully",
        "user_id": str(user.id),
        "new_role": role.name
    }


# ACTIVATE / DEACTIVATE USER
@app.patch("/api/admin/users/{user_id}/status")
def update_user_status(
    user_id: UUID,
    data: AdminUserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Admin"))
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(404, "User not found")

    if user_id == current_user.id and not data.is_active:
        raise HTTPException(400, "You cannot deactivate your own account")

    if (
        not data.is_active
        and user.is_active
        and user.role.name == "Admin"
    ):
        active_admins = db.query(User).join(Role).filter(
            Role.name == "Admin",
            User.is_active == True
        ).count()

        if active_admins <= 1:
            raise HTTPException(400, "Cannot deactivate the last active Admin")

    user.is_active = data.is_active
    db.commit()

    return {
        "message": "User status updated successfully",
        "user_id": str(user.id),
        "is_active": user.is_active
    }


# 1. CREATE CAMPAIGN
@app.post("/api/campaigns")
def create_campaign(
    data: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("Admin", "Campaign Manager")
    )
):
    if data.start_date and data.end_date:
        if data.end_date <= data.start_date:
            raise HTTPException(400, "End date must be after start date")

    campaign = Campaign(
        name=data.name,
        description=data.description,
        start_date=data.start_date,
        end_date=data.end_date,
        created_by=current_user.id,
        status=CampaignStatus.DRAFT
    )

    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    return {
        "message": "Campaign created successfully!",
        "campaign": {
            "id": str(campaign.id),
            "name": campaign.name,
            "description": campaign.description,
            "status": campaign.status.value,
            "created_by": str(campaign.created_by)
        }
    }


# 2. LIST ALL CAMPAIGNS
@app.get("/api/campaigns")
def get_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "Admin", "Campaign Manager",
            "Security Analyst", "Auditor"
        )
    )
):
    campaigns = db.query(Campaign).order_by(
        Campaign.created_at.desc()
    ).all()

    return {
        "total_campaigns": len(campaigns),
        "campaigns": [
            {
                "id": str(c.id),
                "name": c.name,
                "description": c.description,
                "status": c.status.value,
                "created_by": str(c.created_by)
            }
            for c in campaigns
        ]
    }

@app.get("/api/campaigns/eligible-employees")
def get_eligible_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("Admin", "Campaign Manager")
    ),
):
    employees = (
        db.query(User)
        .join(User.role)
        .filter(
            Role.name == "Employee",
            User.is_active.is_(True)
        )
        .order_by(User.full_name.asc())
        .all()
    )

    return [
        {
            "id": str(employee.id),
            "full_name": employee.full_name,
            "email": employee.email,
        }
        for employee in employees
    ]

# 3. VIEW CAMPAIGN DETAILS
@app.get("/api/campaigns/{campaign_id}")
def get_campaign(
    campaign_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "Admin", "Campaign Manager",
            "Security Analyst", "Auditor"
        )
    )
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id
    ).first()

    if not campaign:
        raise HTTPException(404, "Campaign not found")

    return {
        "id": str(campaign.id),
        "name": campaign.name,
        "description": campaign.description,
        "status": campaign.status.value,
        "created_by": str(campaign.created_by),
        "start_date": campaign.start_date,
        "end_date": campaign.end_date
    }


# 4. UPDATE CAMPAIGN
@app.patch("/api/campaigns/{campaign_id}")
def update_campaign(
    campaign_id: UUID,
    data: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("Admin", "Campaign Manager")
    )
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id
    ).first()

    if not campaign:
        raise HTTPException(404, "Campaign not found")

    # Campaign Managers can update only their own campaigns
    if (
        current_user.role.name != "Admin"
        and campaign.created_by != current_user.id
    ):
        raise HTTPException(403, "You cannot update this campaign")

    updates = data.model_dump(exclude_unset=True)

    if "name" in updates and updates["name"] is None:
        raise HTTPException(400, "Campaign name cannot be empty")

    new_start = updates.get("start_date", campaign.start_date)
    new_end = updates.get("end_date", campaign.end_date)

    if new_start and new_end and new_end <= new_start:
        raise HTTPException(400, "End date must be after start date")

    for field, value in updates.items():
        setattr(campaign, field, value)

    db.commit()
    db.refresh(campaign)

    return {
        "message": "Campaign updated successfully!",
        "campaign_id": str(campaign.id),
        "name": campaign.name,
        "status": campaign.status.value
    }


# Helper: check campaign access for campaign managers
def check_campaign_manager_access(campaign, current_user):
    if (
        current_user.role.name == "Campaign Manager"
        and campaign.created_by != current_user.id
    ):
        raise HTTPException(403, "You cannot access this campaign")


# 1. ASSIGN EMPLOYEES TO A CAMPAIGN
@app.post("/api/campaigns/{campaign_id}/targets")
def assign_campaign_targets(
    campaign_id: UUID,
    data: CampaignTargetAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("Admin", "Campaign Manager")
    )
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id
    ).first()

    if not campaign:
        raise HTTPException(404, "Campaign not found")

    check_campaign_manager_access(campaign, current_user)

    assigned = []
    skipped = []

    for user_id in set(data.user_ids):
        employee = db.query(User).filter(
            User.id == user_id
        ).first()

        if not employee or not employee.is_active:
            skipped.append({
                "user_id": str(user_id),
                "reason": "User not found or inactive"
            })
            continue

        if employee.role.name != "Employee":
            skipped.append({
                "user_id": str(user_id),
                "reason": "Only Employees can be campaign targets"
            })
            continue

        existing = db.query(CampaignTarget).filter(
            CampaignTarget.campaign_id == campaign_id,
            CampaignTarget.user_id == user_id
        ).first()

        if existing:
            skipped.append({
                "user_id": str(user_id),
                "reason": "Already assigned"
            })
            continue

        target = CampaignTarget(
            campaign_id=campaign_id,
            user_id=user_id,
            status=TargetStatus.ASSIGNED
        )

        db.add(target)
        assigned.append(str(user_id))

    db.commit()

    return {
        "message": "Campaign target assignment completed",
        "assigned_count": len(assigned),
        "assigned_user_ids": assigned,
        "skipped": skipped
    }


# 2. LIST CAMPAIGN TARGETS
@app.get("/api/campaigns/{campaign_id}/targets")
def get_campaign_targets(
    campaign_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "Admin", "Campaign Manager",
            "Security Analyst", "Auditor"
        )
    )
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id
    ).first()

    if not campaign:
        raise HTTPException(404, "Campaign not found")

    check_campaign_manager_access(campaign, current_user)

    targets = db.query(CampaignTarget).filter(
        CampaignTarget.campaign_id == campaign_id
    ).all()

    return {
        "total_targets": len(targets),
        "targets": [
            {
                "target_id": str(t.id),
                "user_id": str(t.user_id),
                "full_name": t.user.full_name,
                "email": t.user.email,
                "status": t.status.value
            }
            for t in targets
        ]
    }


# 3. CREATE A SIMULATION
@app.post("/api/campaigns/{campaign_id}/simulations")
def create_simulation(
    campaign_id: UUID,
    data: SimulationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("Admin", "Campaign Manager")
    )
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id
    ).first()

    if not campaign:
        raise HTTPException(404, "Campaign not found")

    check_campaign_manager_access(campaign, current_user)

    allowed_difficulties = {"beginner", "intermediate", "advanced"}

    if data.difficulty not in allowed_difficulties:
        raise HTTPException(400, "Invalid difficulty")

    simulation = Simulation(
        title=data.title,
        subject=data.subject,
        content=data.content,
        category=data.category,
        difficulty=data.difficulty,
        ai_generated=False,
        status=SimulationStatus.DRAFT,
        campaign_id=campaign_id,
        created_by=current_user.id
    )

    db.add(simulation)
    db.commit()
    db.refresh(simulation)

    return {
        "message": "Simulation created successfully",
        "simulation": {
            "id": str(simulation.id),
            "title": simulation.title,
            "subject": simulation.subject,
            "category": simulation.category,
            "difficulty": simulation.difficulty,
            "ai_generated": simulation.ai_generated,
            "status": simulation.status.value,
            "campaign_id": str(simulation.campaign_id)
        }
    }


# 4. LIST CAMPAIGN SIMULATIONS
@app.get("/api/campaigns/{campaign_id}/simulations")
def get_campaign_simulations(
    campaign_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "Admin", "Campaign Manager",
            "Security Analyst", "Auditor"
        )
    )
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id
    ).first()

    if not campaign:
        raise HTTPException(404, "Campaign not found")

    check_campaign_manager_access(campaign, current_user)

    simulations = db.query(Simulation).filter(
        Simulation.campaign_id == campaign_id
    ).all()

    return {
        "total_simulations": len(simulations),
        "simulations": [
            {
                "id": str(s.id),
                "title": s.title,
                "subject": s.subject,
                "category": s.category,
                "difficulty": s.difficulty,
                "ai_generated": s.ai_generated,
                "status": s.status.value
            }
            for s in simulations
        ]
    }


@app.post("/api/ai/generate-simulation")
def generate_ai_simulation(
    data: SimulationGenerationRequest,
    current_user: User = Depends(
        require_roles("Admin", "Campaign Manager")
    )
):
    if data.difficulty not in {
        "beginner", "intermediate", "advanced"
    }:
        raise HTTPException(400, "Invalid difficulty")

    # Try LangGraph RAG Multi-Agent workflow first
    try:
        workflow_app = build_simulation_workflow()
        initial_state = {
            "topic": data.topic,
            "difficulty": data.difficulty,
            "context": "",
            "sources": [],
            "generated_content": "",
            "safety_passed": False,
            "status": "started",
            "error": "",
        }
        result = workflow_app.invoke(initial_state)
        generated_content = result.get("generated_content", "")
        sources = result.get("sources", [])
        safety_passed = result.get("safety_passed", True)

        if not generated_content:
            raise ValueError("LangGraph generated empty content.")

        return {
            "message": "AI content generated successfully using LangGraph & ChromaDB RAG!",
            "status": "pending_review",
            "ai_generated": True,
            "generated_by": "Google Gemini (RAG Multi-Agent)",
            "content": generated_content,
            "sources": sources,
            "safety_passed": safety_passed
        }

    except Exception as rag_err:
        print(f"RAG workflow notice: {rag_err}. Falling back to direct Gemini generation.")
        try:
            generated_content = generate_simulation_content(
                topic=data.topic,
                audience=data.audience,
                difficulty=data.difficulty
            )

            return {
                "message": "AI content generated successfully!",
                "status": "pending_review",
                "ai_generated": True,
                "generated_by": "Google Gemini (Direct Fallback)",
                "content": generated_content,
                "sources": ["General Cybersecurity Standards"],
                "safety_passed": True
            }

        except RuntimeError as error:
            print("GEMINI CONFIGURATION ERROR:", str(error))
            raise HTTPException(status_code=503, detail=str(error))

        except Exception as error:
            print("GEMINI ACTUAL ERROR:", repr(error))
            raise HTTPException(
                status_code=502,
                detail="Gemini error: " + str(error)[:500]
            )

@app.post("/api/campaigns/{campaign_id}/simulations/save-ai-draft")
def save_ai_simulation_draft(
    campaign_id: UUID,
    data: SaveAIDraftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("Admin", "Campaign Manager")
    )
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    check_campaign_manager_access(campaign, current_user)

    if data.difficulty not in {"beginner", "intermediate", "advanced"}:
        raise HTTPException(status_code=400, detail="Invalid difficulty")

    simulation = Simulation(
        title=data.title,
        subject=data.subject,
        content=data.content,
        category=data.category,
        difficulty=data.difficulty,
        ai_generated=True,
        status=SimulationStatus.PENDING_REVIEW,
        campaign_id=campaign.id,
        created_by=current_user.id
    )

    db.add(simulation)
    db.commit()
    db.refresh(simulation)

    return {
        "message": "AI simulation draft saved successfully!",
        "ai_generated": simulation.ai_generated,
        "status": simulation.status.value,
        "simulation_id": str(simulation.id),
        "campaign_id": str(simulation.campaign_id)
    }

@app.get("/api/reviews")
def get_reviews(
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("Admin", "Campaign Manager", "Security Analyst")
    )
):
    query = db.query(Simulation, Campaign.name).join(
        Campaign, Simulation.campaign_id == Campaign.id
    )

    if status and status != "all":
        try:
            status_enum = SimulationStatus(status.lower())
            query = query.filter(Simulation.status == status_enum)
        except ValueError:
            pass

    simulations = query.order_by(Simulation.updated_at.desc()).all()

    return [
        {
            "simulation_id": str(sim.id),
            "title": sim.title,
            "subject": sim.subject,
            "content": sim.content,
            "category": sim.category,
            "difficulty": sim.difficulty,
            "ai_generated": sim.ai_generated,
            "campaign_id": str(sim.campaign_id),
            "campaign_name": campaign_name,
            "created_by": str(sim.created_by) if sim.created_by else None,
            "status": sim.status.value,
            "review_comment": sim.review_comment,
            "reviewed_by": str(sim.reviewed_by) if sim.reviewed_by else None,
            "reviewed_at": sim.reviewed_at.isoformat() if sim.reviewed_at else None,
            "created_at": sim.created_at.isoformat() if sim.created_at else None,
        }
        for sim, campaign_name in simulations
    ]

@app.get("/api/reviews/pending")
def get_pending_simulations(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("Admin", "Campaign Manager", "Security Analyst")
    )
):
    simulations = db.query(Simulation, Campaign.name).join(
        Campaign, Simulation.campaign_id == Campaign.id
    ).filter(
        Simulation.status == SimulationStatus.PENDING_REVIEW
    ).all()

    return [
        {
            "simulation_id": str(simulation.id),
            "title": simulation.title,
            "subject": simulation.subject,
            "content": simulation.content,
            "category": simulation.category,
            "difficulty": simulation.difficulty,
            "ai_generated": simulation.ai_generated,
            "campaign_id": str(simulation.campaign_id),
            "campaign_name": campaign_name,
            "created_by": (
                str(simulation.created_by)
                if simulation.created_by else None
            ),
            "status": simulation.status.value,
            "review_comment": simulation.review_comment
        }
        for simulation, campaign_name in simulations
    ]

@app.patch("/api/reviews/{simulation_id}")
def review_simulation(
    simulation_id: UUID,
    data: SimulationReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("Admin", "Campaign Manager", "Security Analyst")
    )
):
    simulation = db.query(Simulation).filter(
        Simulation.id == simulation_id
    ).first()

    if not simulation:
        raise HTTPException(
            status_code=404,
            detail="Simulation not found"
        )

    if simulation.status != SimulationStatus.PENDING_REVIEW:
        raise HTTPException(
            status_code=400,
            detail="Only pending simulations can be reviewed"
        )

    if data.decision == "rejected" and (not data.review_comment or not data.review_comment.strip()):
        raise HTTPException(
            status_code=400,
            detail="A rejection reason is required"
        )

    now = datetime.now(timezone.utc)
    simulation.status = (
        SimulationStatus.APPROVED
        if data.decision == "approved"
        else SimulationStatus.REJECTED
    )
    simulation.review_comment = data.review_comment.strip() if data.review_comment else None
    simulation.reviewed_by = current_user.id
    simulation.reviewed_at = now

    create_audit_log(
        db=db,
        action=f"simulation_{data.decision}",
        entity_type="simulation",
        entity_id=str(simulation.id),
        actor_id=current_user.id,
        details={
            "simulation_title": simulation.title,
            "review_comment": simulation.review_comment,
            "new_status": simulation.status.value
       }
    )

    db.commit()
    db.refresh(simulation)

    return {
        "message": f"Simulation {data.decision} successfully!",
        "simulation_id": str(simulation.id),
        "status": simulation.status.value,
        "reviewed_by": str(current_user.id),
        "review_comment": simulation.review_comment
    }

@app.get("/api/admin/audit-logs")
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("Admin", "Auditor")
    )
):
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(100)
        .all()
    )

    return [
        {
            "id": str(log.id),
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details,
            "actor_id": str(log.actor_id) if log.actor_id else None,
            "created_at": log.created_at.isoformat()
        }
        for log in logs
    ]

@app.post("/api/trainings")
def create_training(
    data: TrainingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("Admin", "Campaign Manager")
    )
):
    training = Training(
        title=data.title,
        description=data.description,
        content=data.content,
        category=data.category,
        is_published=False,
        created_by=current_user.id
    )

    db.add(training)
    db.commit()
    db.refresh(training)

    return {
        "message": "Training created successfully!",
        "training_id": str(training.id),
        "title": training.title,
        "is_published": training.is_published
    }

@app.get("/api/trainings")
def get_trainings(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "Admin", "Campaign Manager",
            "Security Analyst", "Auditor"
        )
    )
):
    trainings = db.query(Training).order_by(
        Training.created_at.desc()
    ).all()

    return [
        {
            "training_id": str(t.id),
            "title": t.title,
            "description": t.description,
            "category": t.category,
            "is_published": t.is_published,
            "created_by": str(t.created_by) if t.created_by else None
        }
        for t in trainings
    ]

@app.patch("/api/trainings/{training_id}/publish")
def publish_training(
    training_id: UUID,
    data: TrainingPublishRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("Admin", "Campaign Manager")
    )
):
    training = db.query(Training).filter(
        Training.id == training_id
    ).first()

    if not training:
        raise HTTPException(404, "Training not found")

    if (
        current_user.role.name == "Campaign Manager"
        and training.created_by != current_user.id
    ):
        raise HTTPException(403, "You can only manage your own training")

    training.is_published = data.is_published

    db.commit()
    db.refresh(training)

    return {
        "message": "Training publication status updated!",
        "training_id": str(training.id),
        "is_published": training.is_published
    }

@app.post("/api/trainings/{training_id}/assign")
def assign_training(
    training_id: UUID,
    data: TrainingAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("Admin", "Campaign Manager")
    )
):
    training = db.query(Training).filter(
        Training.id == training_id
    ).first()

    if not training:
        raise HTTPException(404, "Training not found")

    if not training.is_published:
        raise HTTPException(400, "Publish training before assigning it")

    if (
        current_user.role.name == "Campaign Manager"
        and training.created_by != current_user.id
    ):
        raise HTTPException(403, "You can only assign your own training")

    employee_ids = set(data.employee_ids)

    employees = db.query(User).filter(
        User.id.in_(employee_ids),
        User.is_active.is_(True)
    ).all()

    valid_employees = [
        employee for employee in employees
        if employee.role.name == "Employee"
    ]

    if len(valid_employees) != len(employee_ids):
        raise HTTPException(
            400,
            "One or more IDs are invalid, inactive, or not Employees"
        )

    assigned_count = 0
    skipped_count = 0

    for employee in valid_employees:
        existing = db.query(TrainingAssignment).filter(
            TrainingAssignment.training_id == training.id,
            TrainingAssignment.employee_id == employee.id
        ).first()

        if existing:
            skipped_count += 1
            continue

        assignment = TrainingAssignment(
            training_id=training.id,
            employee_id=employee.id,
            status=TrainingAssignmentStatus.ASSIGNED
        )

        db.add(assignment)
        assigned_count += 1

    db.commit()

    return {
        "message": "Training assignment process completed!",
        "assigned_count": assigned_count,
        "skipped_count": skipped_count
    }

@app.get("/api/trainings/my")
def get_my_trainings(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("Employee")
    )
):
    assignments = db.query(TrainingAssignment).filter(
        TrainingAssignment.employee_id == current_user.id
    ).all()

    return [
        {
            "assignment_id": str(a.id),
            "training_id": str(a.training_id),
            "title": a.training.title,
            "description": a.training.description,
            "content": a.training.content,
            "category": a.training.category,
            "status": a.status.value,
            "completed_at": (
                a.completed_at.isoformat()
                if a.completed_at else None
            )
        }
        for a in assignments
    ]

@app.patch("/api/trainings/assignments/{assignment_id}/complete")
def complete_training(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("Employee")
    )
):
    assignment = db.query(TrainingAssignment).filter(
        TrainingAssignment.id == assignment_id,
        TrainingAssignment.employee_id == current_user.id
    ).first()

    if not assignment:
        raise HTTPException(404, "Training assignment not found")

    if assignment.status == TrainingAssignmentStatus.COMPLETED:
        return {"message": "Training is already completed!"}

    assignment.status = TrainingAssignmentStatus.COMPLETED
    assignment.completed_at = datetime.now(timezone.utc)

    db.commit()

    return {
        "message": "Training completed successfully!",
        "assignment_id": str(assignment.id),
        "status": assignment.status.value,
        "completed_at": assignment.completed_at.isoformat()
    }

@app.get("/api/trainings/{training_id}/progress")
def get_training_progress(
    training_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "Admin", "Campaign Manager",
            "Security Analyst", "Auditor"
        )
    )
):
    training = db.query(Training).filter(
        Training.id == training_id
    ).first()

    if not training:
        raise HTTPException(404, "Training not found")

    if (
        current_user.role.name == "Campaign Manager"
        and training.created_by != current_user.id
    ):
        raise HTTPException(403, "You can only view your own training")

    assignments = db.query(TrainingAssignment).filter(
        TrainingAssignment.training_id == training.id
    ).all()

    completed = sum(
        1 for a in assignments
        if a.status == TrainingAssignmentStatus.COMPLETED
    )

    return {
        "training_id": str(training.id),
        "training_title": training.title,
        "total_assigned": len(assignments),
        "completed": completed,
        "pending": len(assignments) - completed,
        "completion_percentage": (
            round(completed / len(assignments) * 100, 2)
            if assignments else 0
        ),
        "employees": [
            {
                "assignment_id": str(a.id),
                "employee_id": str(a.employee_id),
                "employee_name": a.employee.full_name,
                "status": a.status.value,
                "completed_at": (
                    a.completed_at.isoformat()
                    if a.completed_at else None
                )
            }
            for a in assignments
        ]
    }

@app.get("/api/dashboard/overview")
def dashboard_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "Admin",
            "Campaign Manager",
            "Security Analyst",
            "Auditor"
        )
    )
):
    is_manager = current_user.role.name == "Campaign Manager"

    campaign_query = db.query(Campaign)

    if is_manager:
        campaign_query = campaign_query.filter(
            Campaign.created_by == current_user.id
        )

    total_campaigns = campaign_query.count()

    campaign_ids = campaign_query.with_entities(
        Campaign.id
    ).subquery()

    simulation_query = db.query(Simulation).filter(
        Simulation.campaign_id.in_(campaign_ids.select())
    )

    total_simulations = simulation_query.count()

    training_query = db.query(Training)

    if is_manager:
        training_query = training_query.filter(
            Training.created_by == current_user.id
        )

    total_trainings = training_query.count()

    assignment_query = db.query(TrainingAssignment).join(
        Training,
        TrainingAssignment.training_id == Training.id
    )

    if is_manager:
        assignment_query = assignment_query.filter(
            Training.created_by == current_user.id
        )

    total_assignments = assignment_query.count()

    completed_assignments = assignment_query.filter(
        TrainingAssignment.status == TrainingAssignmentStatus.COMPLETED
    ).count()

    pending_assignments = assignment_query.filter(
        TrainingAssignment.status == TrainingAssignmentStatus.ASSIGNED
    ).count()

    completion_percentage = (
        round((completed_assignments / total_assignments) * 100, 2)
        if total_assignments > 0 else 0
    )

    total_users = None

    if not is_manager:
        total_users = db.query(func.count(User.id)).scalar() or 0

    return {
        "total_users": total_users,
        "total_campaigns": total_campaigns,
        "total_simulations": total_simulations,
        "total_trainings": total_trainings,
        "total_training_assignments": total_assignments,
        "completed_trainings": completed_assignments,
        "pending_trainings": pending_assignments,
        "training_completion_percentage": completion_percentage
    }

@app.get("/api/dashboard/campaign-analytics")
def campaign_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "Admin",
            "Campaign Manager",
            "Security Analyst",
            "Auditor"
        )
    )
):
    campaign_query = db.query(Campaign)

    if current_user.role.name == "Campaign Manager":
        campaign_query = campaign_query.filter(
            Campaign.created_by == current_user.id
        )

    status_counts = (
        campaign_query
        .with_entities(
            Campaign.status,
            func.count(Campaign.id)
        )
        .group_by(Campaign.status)
        .all()
    )

    campaign_ids = campaign_query.with_entities(
        Campaign.id
    ).subquery()

    result_query = (
        db.query(
            CampaignResult.outcome,
            func.count(CampaignResult.id)
        )
        .join(
            CampaignTarget,
            CampaignResult.target_id == CampaignTarget.id
        )
        .filter(CampaignTarget.campaign_id.in_(campaign_ids.select()))
    )

    result_counts = (
        result_query
        .group_by(CampaignResult.outcome)
        .all()
    )

    return {
        "campaign_status": {
            status.value: count
            for status, count in status_counts
        },
        "simulation_outcomes": {
            outcome.value: count
            for outcome, count in result_counts
        }
    }

@app.get("/api/dashboard/training-analytics")
def training_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "Admin",
            "Campaign Manager",
            "Security Analyst",
            "Auditor"
        )
    )
):
    assignment_query = (
        db.query(TrainingAssignment)
        .join(
            Training,
            TrainingAssignment.training_id == Training.id
        )
    )

    if current_user.role.name == "Campaign Manager":
        assignment_query = assignment_query.filter(
            Training.created_by == current_user.id
        )

    total_assigned = assignment_query.count()

    completed = assignment_query.filter(
        TrainingAssignment.status == TrainingAssignmentStatus.COMPLETED
    ).count()

    pending = assignment_query.filter(
        TrainingAssignment.status == TrainingAssignmentStatus.ASSIGNED
    ).count()

    completion_percentage = (
        round((completed / total_assigned) * 100, 2)
        if total_assigned > 0 else 0
    )

    return {
        "total_assigned": total_assigned,
        "completed": completed,
        "pending": pending,
        "completion_percentage": completion_percentage
    }
@app.get("/api/simulations/my")
def get_my_simulations(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("Employee")
    )
):
    results = (
        db.query(
            Simulation,
            CampaignTarget,
            CampaignResult,
            Campaign.name
        )
        .join(
            CampaignTarget,
            Simulation.campaign_id == CampaignTarget.campaign_id
        )
        .join(
            Campaign,
            Campaign.id == Simulation.campaign_id
        )
        .outerjoin(
            CampaignResult,
            and_(
                CampaignResult.target_id == CampaignTarget.id,
                CampaignResult.simulation_id == Simulation.id
            )
        )
        .filter(
            CampaignTarget.user_id == current_user.id,
            Simulation.status == SimulationStatus.APPROVED
        )
        .order_by(Simulation.created_at.desc())
        .all()
    )

    return [
        {
            "simulation_id": str(simulation.id),
            "title": simulation.title,
            "subject": simulation.subject,
            "content": simulation.content,
            "category": simulation.category,
            "difficulty": simulation.difficulty,
            "campaign_name": campaign_name,
            "outcome": (
                result.outcome.value
                if result else "assigned"
            ),
            "opened_at": (
                result.opened_at.isoformat()
                if result and result.opened_at else None
            ),
            "reported_at": (
                result.reported_at.isoformat()
                if result and result.reported_at else None
            )
        }
        for simulation, target, result, campaign_name in results
    ]

@app.post("/api/simulations/{simulation_id}/open")
def open_my_simulation(
    simulation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("Employee")
    )
):
    simulation = (
        db.query(Simulation)
        .filter(
            Simulation.id == simulation_id,
            Simulation.status == SimulationStatus.APPROVED
        )
        .first()
    )

    if not simulation:
        raise HTTPException(
            status_code=404,
            detail="Approved simulation not found."
        )

    target = (
        db.query(CampaignTarget)
        .filter(
            CampaignTarget.campaign_id == simulation.campaign_id,
            CampaignTarget.user_id == current_user.id
        )
        .first()
    )

    if not target:
        raise HTTPException(
            status_code=403,
            detail="This simulation is not assigned to you."
        )

    result = (
        db.query(CampaignResult)
        .filter(
            CampaignResult.target_id == target.id,
            CampaignResult.simulation_id == simulation.id
        )
        .first()
    )

    now = datetime.now(timezone.utc)

    if not result:
        result = CampaignResult(
            target_id=target.id,
            simulation_id=simulation.id,
            outcome=ResultOutcome.OPENED,
            opened_at=now
        )
        db.add(result)
    else:
        if not result.opened_at:
            result.opened_at = now

        if result.outcome == ResultOutcome.ASSIGNED:
            result.outcome = ResultOutcome.OPENED

    db.commit()

    return {
        "message": "Simulation opened successfully.",
        "simulation_id": str(simulation.id),
        "outcome": result.outcome.value
    }

@app.post("/api/simulations/{simulation_id}/report")
def report_my_simulation(
    simulation_id: uuid.UUID,
    request: SimulationReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("Employee")
    )
):
    simulation = (
        db.query(Simulation)
        .filter(
            Simulation.id == simulation_id,
            Simulation.status == SimulationStatus.APPROVED
        )
        .first()
    )

    if not simulation:
        raise HTTPException(
            status_code=404,
            detail="Approved simulation not found."
        )

    target = (
        db.query(CampaignTarget)
        .filter(
            CampaignTarget.campaign_id == simulation.campaign_id,
            CampaignTarget.user_id == current_user.id
        )
        .first()
    )

    if not target:
        raise HTTPException(
            status_code=403,
            detail="This simulation is not assigned to you."
        )

    result = (
        db.query(CampaignResult)
        .filter(
            CampaignResult.target_id == target.id,
            CampaignResult.simulation_id == simulation.id
        )
        .first()
    )

    now = datetime.now(timezone.utc)

    if not result:
        result = CampaignResult(
            target_id=target.id,
            simulation_id=simulation.id,
            outcome=ResultOutcome.REPORTED,
            reported_at=now,
            feedback=request.feedback
        )
        db.add(result)
    else:
        result.outcome = ResultOutcome.REPORTED
        result.reported_at = now
        result.feedback = request.feedback

    db.commit()

    return {
        "message": "Simulation reported successfully.",
        "simulation_id": str(simulation.id),
        "outcome": result.outcome.value
    }

@app.post("/api/simulations/{simulation_id}/complete")
def complete_my_simulation(
    simulation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("Employee")
    )
):
    simulation = (
        db.query(Simulation)
        .filter(
            Simulation.id == simulation_id,
            Simulation.status == SimulationStatus.APPROVED
        )
        .first()
    )

    if not simulation:
        raise HTTPException(
            status_code=404,
            detail="Approved simulation not found."
        )

    target = (
        db.query(CampaignTarget)
        .filter(
            CampaignTarget.campaign_id == simulation.campaign_id,
            CampaignTarget.user_id == current_user.id
        )
        .first()
    )

    if not target:
        raise HTTPException(
            status_code=403,
            detail="This simulation is not assigned to you."
        )

    result = (
        db.query(CampaignResult)
        .filter(
            CampaignResult.target_id == target.id,
            CampaignResult.simulation_id == simulation.id
        )
        .first()
    )

    now = datetime.now(timezone.utc)

    if not result:
        result = CampaignResult(
            target_id=target.id,
            simulation_id=simulation.id,
            outcome=ResultOutcome.COMPLETED,
            completed_at=now
        )
        db.add(result)
    else:
        result.outcome = ResultOutcome.COMPLETED
        result.completed_at = now

    create_audit_log(
        db=db,
        action="simulation_completed",
        entity_type="simulation",
        entity_id=str(simulation.id),
        actor_id=current_user.id,
        details={
            "simulation_title": simulation.title,
            "campaign_id": str(simulation.campaign_id),
            "status": "completed"
        }
    )

    db.commit()

    return {
        "message": "Simulation completed successfully.",
        "simulation_id": str(simulation.id),
        "outcome": result.outcome.value
    }

@app.patch("/api/simulations/{simulation_id}/content")
def update_simulation_content(
    simulation_id: uuid.UUID,
    request: SimulationContentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("Admin", "Campaign Manager")
    )
):
    simulation = (
        db.query(Simulation)
        .filter(Simulation.id == simulation_id)
        .first()
    )

    if not simulation:
        raise HTTPException(
            status_code=404,
            detail="Simulation not found."
        )

    if current_user.role.name == "Campaign Manager":
        check_campaign_manager_access(
            simulation.campaign,
            current_user
        )

    simulation.content = request.content
    simulation.status = SimulationStatus.PENDING_REVIEW

    db.commit()
    db.refresh(simulation)

    return {
        "message": "Simulation updated and submitted for human review.",
        "simulation_id": str(simulation.id),
        "status": simulation.status.value
    }
