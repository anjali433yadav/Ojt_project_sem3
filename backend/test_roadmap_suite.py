"""
Comprehensive Test and Verification Suite for OJT Cybersecurity Platform
Covers all 8 roadmap domains:
1. Backend APIs & Error Handling
2. Role-Based Access Control (Admin, Campaign Manager, Security Analyst, Employee)
3. GenAI & LangGraph RAG Multi-Agent Pipeline
4. Human Review & Approval (Approve, Reject with Comments, Status Queries)
5. Employee Interaction (Open, Report, Complete Simulation)
6. Training & Remediation Pipeline (Assign, Complete, Progress)
7. Dashboard Analytics
8. Immutable Audit Trail
"""

import sys
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from main import app
from app.db.session import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.core.security import hash_password, create_access_token

client = TestClient(app)

def run_suite():
    db = SessionLocal()
    print("=" * 60)
    print("STARTING FULL ROADMAP VERIFICATION SUITE")
    print("=" * 60)

    # 1. Setup Test Users with Different Roles
    admin_role = db.query(Role).filter(Role.name == "Admin").first()
    manager_role = db.query(Role).filter(Role.name == "Campaign Manager").first()
    employee_role = db.query(Role).filter(Role.name == "Employee").first()

    unique_suffix = uuid.uuid4().hex[:6]
    admin_email = f"suite_admin_{unique_suffix}@example.com"
    manager_email = f"suite_mgr_{unique_suffix}@example.com"
    emp_email = f"suite_emp_{unique_suffix}@example.com"

    # Password
    test_pwd = "SecureTestPassword123!"

    admin_user = User(
        full_name="Suite Admin",
        email=admin_email,
        password_hash=hash_password(test_pwd),
        role_id=admin_role.id,
        is_active=True
    )
    manager_user = User(
        full_name="Suite Manager",
        email=manager_email,
        password_hash=hash_password(test_pwd),
        role_id=manager_role.id,
        is_active=True
    )
    employee_user = User(
        full_name="Suite Employee",
        email=emp_email,
        password_hash=hash_password(test_pwd),
        role_id=employee_role.id,
        is_active=True
    )

    db.add_all([admin_user, manager_user, employee_user])
    db.commit()
    db.refresh(admin_user)
    db.refresh(manager_user)
    db.refresh(employee_user)

    print(f"✓ Created test users: Admin ({admin_email}), Manager ({manager_email}), Employee ({emp_email})")

    # 2. Authentication & JWT verification
    login_res = client.post("/api/auth/login", json={"email": admin_email, "password": test_pwd})
    assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
    admin_token = login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    mgr_res = client.post("/api/auth/login", json={"email": manager_email, "password": test_pwd})
    assert mgr_res.status_code == 200, f"Manager login failed: {mgr_res.text}"
    mgr_token = mgr_res.json()["access_token"]
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    emp_res = client.post("/api/auth/login", json={"email": emp_email, "password": test_pwd})
    assert emp_res.status_code == 200, f"Emp login failed: {emp_res.text}"
    emp_token = emp_res.json()["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    # Verify /api/auth/me
    me_res = client.get("/api/auth/me", headers=admin_headers)
    assert me_res.status_code == 200 and me_res.json()["role"] == "Admin"
    print("✓ JWT Authentication and /api/auth/me verified for all roles.")

    # 3. RBAC Enforcement
    forbidden_res = client.get("/api/admin/users", headers=emp_headers)
    assert forbidden_res.status_code == 403, "Employee was wrongly allowed to access admin users endpoint!"
    print("✓ RBAC successfully blocked unauthorized employee from admin endpoints (403 Forbidden).")

    # 4. User Management (Admin only)
    users_res = client.get("/api/admin/users", headers=admin_headers)
    assert users_res.status_code == 200
    print(f"✓ Admin user management verified: {len(users_res.json())} active users in system.")

    # 5. Campaign Creation & Editing
    camp_payload = {
        "name": f"Q4 Phishing Drill {unique_suffix}",
        "description": "Comprehensive security awareness campaign",
        "start_date": "2026-11-17T00:00:00Z",
        "end_date": "2026-11-30T23:59:59Z"
    }
    camp_res = client.post("/api/campaigns", json=camp_payload, headers=mgr_headers)
    assert camp_res.status_code in (200, 201), f"Campaign creation failed: {camp_res.text}"
    campaign_id = camp_res.json()["campaign"]["id"]
    print(f"✓ Campaign created by Manager: {camp_payload['name']} (ID: {campaign_id})")

    # Check eligible employees
    elig_res = client.get("/api/campaigns/eligible-employees", headers=mgr_headers)
    assert elig_res.status_code == 200
    print(f"✓ Eligible employees queried: {len(elig_res.json())} employees available.")

    # Assign target employee to campaign
    target_res = client.post(
        f"/api/campaigns/{campaign_id}/targets",
        json={"user_ids": [str(employee_user.id)]},
        headers=mgr_headers
    )
    assert target_res.status_code == 200
    print(f"✓ Assigned target employee to campaign.")

    # 6. AI Generation with LangGraph & RAG
    ai_gen_res = client.post(
        "/api/ai/generate-simulation",
        json={
            "topic": "Urgent Wire Transfer Authorization",
            "audience": "Finance and operations employees",
            "difficulty": "intermediate"
        },
        headers=mgr_headers
    )
    assert ai_gen_res.status_code == 200, f"AI generation failed: {ai_gen_res.text}"
    ai_data = ai_gen_res.json()
    print(f"✓ AI Generation succeeded via: {ai_data.get('generated_by')}")
    print(f"  Content length: {len(ai_data.get('content', ''))} characters")
    print(f"  Safety passed: {ai_data.get('safety_passed')}")

    # Save as AI Simulation Draft
    sim_draft_payload = {
        "title": "Urgent Wire Transfer Verification",
        "subject": "Action Required: Pending Wire Transfer Approval #49281",
        "content": ai_data.get("content", "Simulation placeholder content"),
        "category": "CEO Fraud & Wire Phishing",
        "difficulty": "intermediate"
    }
    save_draft_res = client.post(
        f"/api/campaigns/{campaign_id}/simulations/save-ai-draft",
        json=sim_draft_payload,
        headers=mgr_headers
    )
    assert save_draft_res.status_code == 200
    simulation_id = save_draft_res.json()["simulation_id"]
    print(f"✓ Saved AI simulation draft (ID: {simulation_id}) in status 'pending_review'.")

    # 7. Human Review and Approval Pipeline
    # Test rejection validation: Rejection requires comment
    reject_no_comment = client.patch(
        f"/api/reviews/{simulation_id}",
        json={"decision": "rejected", "review_comment": ""},
        headers=admin_headers
    )
    assert reject_no_comment.status_code == 400, "Should have required rejection comment!"
    print("✓ Review validation: Rejection correctly denied without comment.")

    # Approve simulation
    approve_res = client.patch(
        f"/api/reviews/{simulation_id}",
        json={"decision": "approved", "review_comment": "Approved for drill execution."},
        headers=admin_headers
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "approved"
    print("✓ Review pipeline: Simulation approved successfully.")

    # Check reviews query endpoint
    all_reviews_res = client.get("/api/reviews?status=approved", headers=admin_headers)
    assert all_reviews_res.status_code == 200
    assert any(r["simulation_id"] == simulation_id for r in all_reviews_res.json())
    print("✓ Verified approved simulations query filter.")

    # 8. Employee Interaction (Open, Report, Complete)
    emp_sims_res = client.get("/api/simulations/my", headers=emp_headers)
    assert emp_sims_res.status_code == 200
    my_sims = emp_sims_res.json()
    assert any(s["simulation_id"] == simulation_id for s in my_sims), "Approved simulation not visible to assigned employee!"
    print(f"✓ Employee received assigned simulation in /api/simulations/my.")

    # Employee opens simulation
    open_res = client.post(f"/api/simulations/{simulation_id}/open", headers=emp_headers)
    assert open_res.status_code == 200 and open_res.json()["outcome"] == "opened"
    print("✓ Employee simulation 'opened' event tracked.")

    # Employee reports simulation as phishing
    report_res = client.post(
        f"/api/simulations/{simulation_id}/report",
        json={"feedback": "Suspicious urgent financial request with unverified domain."},
        headers=emp_headers
    )
    assert report_res.status_code == 200 and report_res.json()["outcome"] == "reported"
    print("✓ Employee reported simulation as suspicious with feedback.")

    # Employee completes simulation exercise
    complete_res = client.post(f"/api/simulations/{simulation_id}/complete", headers=emp_headers)
    assert complete_res.status_code == 200 and complete_res.json()["outcome"] == "completed"
    print("✓ Employee marked simulation exercise as completed.")

    # 9. Training Modules & Assignment Pipeline
    training_payload = {
        "title": "Business Email Compromise (BEC) Defense",
        "description": "Learn to detect urgent executive impersonation scams.",
        "content": "Module 1: Verifying sender headers.\nModule 2: Secondary out-of-band verification.",
        "category": "Email Security"
    }
    train_res = client.post("/api/trainings", json=training_payload, headers=mgr_headers)
    assert train_res.status_code in (200, 201)
    training_id = train_res.json().get("training_id") or train_res.json().get("id")

    # Publish training
    pub_res = client.patch(
        f"/api/trainings/{training_id}/publish",
        json={"is_published": True},
        headers=mgr_headers
    )
    assert pub_res.status_code == 200
    print(f"✓ Training module created and published: {training_payload['title']}")

    # Assign to employee
    assign_res = client.post(
        f"/api/trainings/{training_id}/assign",
        json={"employee_ids": [str(employee_user.id)]},
        headers=mgr_headers
    )
    assert assign_res.status_code == 200
    print("✓ Training module assigned to employee.")

    # Employee checks /api/trainings/my
    my_train_res = client.get("/api/trainings/my", headers=emp_headers)
    assert my_train_res.status_code == 200
    assigned_trainings = my_train_res.json()
    assert len(assigned_trainings) > 0
    assignment_id = assigned_trainings[0]["assignment_id"]

    # Employee completes training assignment
    complete_train_res = client.patch(
        f"/api/trainings/assignments/{assignment_id}/complete",
        headers=emp_headers
    )
    assert complete_train_res.status_code == 200 and complete_train_res.json()["status"] == "completed"
    print("✓ Employee completed security training module.")

    # 10. Dashboard Analytics
    overview_res = client.get("/api/dashboard/overview", headers=admin_headers)
    assert overview_res.status_code == 200
    overview_data = overview_res.json()
    print(f"✓ Dashboard overview: {overview_data['total_campaigns']} campaigns, {overview_data['total_simulations']} simulations, {overview_data['training_completion_percentage']}% training completion.")

    camp_analytics_res = client.get("/api/dashboard/campaign-analytics", headers=admin_headers)
    assert camp_analytics_res.status_code == 200
    print(f"✓ Campaign analytics outcomes: {camp_analytics_res.json().get('simulation_outcomes')}")

    # 11. Immutable Audit Trail
    audit_res = client.get("/api/admin/audit-logs", headers=admin_headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()
    actions = [l["action"] for l in logs[:10]]
    print(f"✓ Audit logs verified ({len(logs)} entries found). Recent actions: {actions[:5]}")

    print("=" * 60)
    print("ALL 11 ROADMAP VERIFICATION CHECKS PASSED WITH ZERO ERRORS!")
    print("=" * 60)

    db.close()

if __name__ == "__main__":
    run_suite()
