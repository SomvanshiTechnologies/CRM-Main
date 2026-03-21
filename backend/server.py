from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import shutil
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

UPLOADS_DIR = ROOT_DIR / "uploads" / "avatars"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'somvanshi-crm-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Somvanshi CRM API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== ENUMS ====================
class UserRole(str, Enum):
    ADMIN = "admin"
    SALES = "sales"

# ==================== LEVEL SYSTEM ====================
LEVEL_THRESHOLDS = [0, 50, 150, 300, 500, 750, 1100, 1500, 2000, 3000]
LEVEL_NAMES = [
    "Prospect", "Qualifier", "Connector", "Closer",
    "Performer", "Specialist", "Expert", "Elite", "Master", "Legend"
]
XP_VALUES = {
    "lead_created":    5,
    "stage_updated":   3,
    "activity_logged": 5,
    "meeting_booked":  15,
    "deal_closed":     50,
}

def calculate_level(xp: int) -> int:
    level = 1
    for i, threshold in enumerate(LEVEL_THRESHOLDS):
        if xp >= threshold:
            level = i + 1
    return level

def get_level_info(xp: int) -> dict:
    level = calculate_level(xp)
    current_threshold = LEVEL_THRESHOLDS[level - 1]
    next_threshold = LEVEL_THRESHOLDS[level] if level < len(LEVEL_THRESHOLDS) else None
    progress_pct = 0
    if next_threshold is not None:
        progress_pct = int((xp - current_threshold) / (next_threshold - current_threshold) * 100)
    return {
        "level": level,
        "level_name": LEVEL_NAMES[level - 1],
        "xp": xp,
        "current_threshold": current_threshold,
        "next_threshold": next_threshold,
        "progress_pct": progress_pct,
    }

async def award_xp(user_id: str, action_type: str, reference_id: str):
    """Award XP for an action with deduplication via xp_events collection."""
    # Check for duplicate event
    existing = await db.xp_events.find_one(
        {"user_id": user_id, "action_type": action_type, "reference_id": reference_id}
    )
    if existing:
        return  # Already awarded — skip

    xp_amount = XP_VALUES.get(action_type, 0)
    if xp_amount == 0:
        return

    # Record the event
    await db.xp_events.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action_type": action_type,
        "reference_id": reference_id,
        "xp_amount": xp_amount,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # Increment XP and recalculate level
    await db.users.update_one({"id": user_id}, {"$inc": {"xp": xp_amount}})
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "xp": 1})
    new_xp = updated_user.get("xp", 0) if updated_user else 0
    new_level = calculate_level(new_xp)
    await db.users.update_one({"id": user_id}, {"$set": {"level": new_level}})

class LeadStage(str, Enum):
    LEAD_IDENTIFIED = "Lead Identified"
    CONTACTED = "Contacted"
    FIRST_CALL_SCHEDULED = "First Call Scheduled"
    FIRST_CALL_DONE = "First Call Done"
    FOLLOW_UP = "Follow Up"
    MEETING_SCHEDULED = "Meeting Scheduled"
    MEETING_COMPLETED = "Meeting Completed"
    PROPOSAL_SENT = "Proposal Sent"
    NEGOTIATION = "Negotiation"
    CLOSED_WON = "Closed Won"
    CLOSED_LOST = "Closed Lost"

class LeadSource(str, Enum):
    APOLLO = "Apollo"
    LINKEDIN = "LinkedIn"
    REFERRAL = "Referral"
    WEBSITE = "Website"
    EVENT = "Event"
    OTHER = "Other"

class ActivityType(str, Enum):
    CALL = "Call"
    EMAIL = "Email"
    WHATSAPP = "WhatsApp"
    MEETING = "Meeting"
    NOTE = "Note"
    FOLLOW_UP = "Follow Up"

class MeetingType(str, Enum):
    DISCOVERY = "Discovery"
    DEMO = "Demo"
    PROPOSAL = "Proposal"
    NEGOTIATION = "Negotiation"
    OTHER = "Other"

class NotificationType(str, Enum):
    FOLLOW_UP_REMINDER = "follow_up_reminder"
    MEETING_ALERT = "meeting_alert"
    LEAD_ASSIGNED = "lead_assigned"
    DEAL_WON = "deal_won"
    OVERDUE_TASK = "overdue_task"

# ==================== MODELS ====================
class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: UserRole
    avatar_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: UserRole
    avatar_url: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    avatar_url: Optional[str] = None
    xp: int = 0
    level: int = 1

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    token: str
    user: UserResponse

class LeadCreate(BaseModel):
    company_name: str
    website: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    location: Optional[str] = None
    contact_name: str
    contact_designation: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    contact_linkedin: Optional[str] = None
    source: LeadSource = LeadSource.OTHER
    owner_id: Optional[str] = None
    estimated_value: float = 0
    expected_close_date: Optional[str] = None
    notes: Optional[str] = None

class LeadUpdate(BaseModel):
    company_name: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    location: Optional[str] = None
    contact_name: Optional[str] = None
    contact_designation: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    contact_linkedin: Optional[str] = None
    source: Optional[LeadSource] = None
    owner_id: Optional[str] = None
    stage: Optional[LeadStage] = None
    estimated_value: Optional[float] = None
    final_value: Optional[float] = None
    expected_close_date: Optional[str] = None
    notes: Optional[str] = None

class LeadResponse(BaseModel):
    id: str
    company_name: str
    website: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    location: Optional[str] = None
    contact_name: str
    contact_designation: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_linkedin: Optional[str] = None
    source: str
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    stage: str
    estimated_value: float
    final_value: Optional[float] = None
    expected_close_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str

class ActivityCreate(BaseModel):
    lead_id: str
    activity_type: ActivityType
    description: str
    scheduled_at: Optional[str] = None

class ActivityResponse(BaseModel):
    id: str
    lead_id: str
    user_id: str
    user_name: str
    activity_type: str
    description: str
    scheduled_at: Optional[str] = None
    completed: bool
    created_at: str

class MeetingCreate(BaseModel):
    lead_id: str
    meeting_type: MeetingType
    scheduled_at: str
    outcome: Optional[str] = None
    notes: Optional[str] = None
    next_action: Optional[str] = None

class MeetingUpdate(BaseModel):
    meeting_type: Optional[MeetingType] = None
    scheduled_at: Optional[str] = None
    outcome: Optional[str] = None
    notes: Optional[str] = None
    next_action: Optional[str] = None
    completed: Optional[bool] = None

class MeetingResponse(BaseModel):
    id: str
    lead_id: str
    lead_company: str
    user_id: str
    user_name: str
    meeting_type: str
    scheduled_at: str
    outcome: Optional[str] = None
    notes: Optional[str] = None
    next_action: Optional[str] = None
    completed: bool
    created_at: str

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    notification_type: str
    title: str
    message: str
    read: bool
    lead_id: Optional[str] = None
    created_at: str

class DashboardStats(BaseModel):
    total_leads: int
    leads_by_stage: dict
    total_pipeline_value: float
    closed_revenue: float
    expected_revenue: float
    meetings_booked: int
    conversion_rate: float
    deals_closed_won: int
    deals_closed_lost: int

class SalespersonPerformance(BaseModel):
    user_id: str
    user_name: str
    avatar_url: Optional[str] = None
    leads_added: int
    activities_logged: int
    meetings_booked: int
    deals_closed: int
    revenue_generated: float
    conversion_rate: float

# ==================== AUTH HELPERS ====================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== SEED DATA ====================
async def seed_users():
    existing = await db.users.count_documents({})
    if existing == 0:
        default_password = hash_password("SomvanshiTechnologies@101025")
        users = [
            {
                "id": str(uuid.uuid4()),
                "email": "ameya@somvanshi.tech",
                "name": "Ameya Somvanshi",
                "password": default_password,
                "role": UserRole.ADMIN.value,
                "avatar_url": "https://images.unsplash.com/photo-1576558656222-ba66febe3dec?w=150",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "email": "rajdeep@somvanshi.tech",
                "name": "Rajdeep Ghai",
                "password": default_password,
                "role": UserRole.SALES.value,
                "avatar_url": "https://images.unsplash.com/photo-1655249493799-9cee4fe983bb?w=150",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "email": "ishaan@somvanshi.tech",
                "name": "Ishaan Nair",
                "password": default_password,
                "role": UserRole.SALES.value,
                "avatar_url": "https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?w=150",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "email": "bhargavi@somvanshi.tech",
                "name": "Bhargavi Mutyarapwar",
                "password": default_password,
                "role": UserRole.SALES.value,
                "avatar_url": "https://images.unsplash.com/photo-1655249481446-25d575f1c054?w=150",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        await db.users.insert_many(users)
        logger.info("Seeded 4 default users")

# ==================== AUTH ROUTES ====================
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user or not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["role"])
    return LoginResponse(
        token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            avatar_url=user.get("avatar_url")
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**user)

# ==================== USER ROUTES ====================
class UserUpdateSelf(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class UserCreateAdmin(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: UserRole = UserRole.SALES
    avatar_url: Optional[str] = None

class UserRoleUpdate(BaseModel):
    role: UserRole

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(get_current_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
    return [UserResponse(**u) for u in users]

@api_router.get("/users/sales", response_model=List[UserResponse])
async def get_sales_users(user: dict = Depends(get_current_user)):
    users = await db.users.find({"role": UserRole.SALES.value}, {"_id": 0, "password": 0}).to_list(100)
    return [UserResponse(**u) for u in users]

@api_router.put("/users/me", response_model=UserResponse)
async def update_profile(update: UserUpdateSelf, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return UserResponse(**updated)

@api_router.post("/users/me/avatar", response_model=UserResponse)
async def upload_avatar(request: Request, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP or GIF images are allowed")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be smaller than 5 MB")

    # Delete previous uploaded avatar (if it was a local upload)
    old_avatar = user.get("avatar_url", "")
    if old_avatar and "/uploads/avatars/" in old_avatar:
        old_filename = old_avatar.split("/uploads/avatars/")[-1]
        old_path = UPLOADS_DIR / old_filename
        if old_path.exists():
            old_path.unlink()

    ext = (file.filename or "photo").rsplit(".", 1)[-1].lower()
    if ext not in {"jpg", "jpeg", "png", "webp", "gif"}:
        ext = "jpg"
    filename = f"{user['id']}.{ext}"
    filepath = UPLOADS_DIR / filename
    with open(filepath, "wb") as f:
        f.write(content)

    base_url = str(request.base_url).rstrip("/")
    avatar_url = f"{base_url}/uploads/avatars/{filename}"
    await db.users.update_one({"id": user["id"]}, {"$set": {"avatar_url": avatar_url}})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return UserResponse(**updated)

@api_router.put("/users/me/password")
async def change_password(req: PasswordChange, user: dict = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not verify_password(req.current_password, user_doc["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password": hash_password(req.new_password)}})
    return {"message": "Password changed successfully"}

@api_router.post("/users", response_model=UserResponse)
async def create_user(new_user: UserCreateAdmin, admin: dict = Depends(get_admin_user)):
    existing = await db.users.find_one({"email": new_user.email})
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": new_user.email,
        "name": new_user.name,
        "password": hash_password(new_user.password),
        "role": new_user.role.value,
        "avatar_url": new_user.avatar_url,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    return UserResponse(**user_doc)

@api_router.put("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(user_id: str, update: UserRoleUpdate, admin: dict = Depends(get_admin_user)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="You cannot change your own role")
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one({"id": user_id}, {"$set": {"role": update.role.value}})
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return UserResponse(**updated)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.delete_one({"id": user_id})
    return {"message": "User deleted successfully"}

# ==================== LEAD ROUTES ====================
@api_router.post("/leads", response_model=LeadResponse)
async def create_lead(lead: LeadCreate, user: dict = Depends(get_current_user)):
    lead_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    owner_id = lead.owner_id or user["id"]
    owner = await db.users.find_one({"id": owner_id}, {"_id": 0, "name": 1})
    owner_name = owner["name"] if owner else None
    
    lead_doc = {
        "id": lead_id,
        **lead.model_dump(),
        "owner_id": owner_id,
        "stage": LeadStage.LEAD_IDENTIFIED.value,
        "final_value": None,
        "created_at": now,
        "updated_at": now,
        "created_by": user["id"]
    }
    
    await db.leads.insert_one(lead_doc)

    # Award XP for creating a lead (to the owner)
    await award_xp(owner_id, "lead_created", lead_id)

    # Create notification for lead owner if assigned to someone else
    if lead.owner_id and lead.owner_id != user["id"]:
        await create_notification(
            lead.owner_id,
            NotificationType.LEAD_ASSIGNED,
            "New Lead Assigned",
            f"You have been assigned a new lead: {lead.company_name}",
            lead_id
        )
    
    return LeadResponse(**{**lead_doc, "owner_name": owner_name})

@api_router.get("/leads", response_model=List[LeadResponse])
async def get_leads(
    stage: Optional[str] = None,
    owner_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {"is_deleted": {"$ne": True}}

    # Sales users can only see their own leads
    if user["role"] == UserRole.SALES.value:
        query["owner_id"] = user["id"]
    elif owner_id:
        query["owner_id"] = owner_id

    if stage:
        query["stage"] = stage

    leads = await db.leads.find(query, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    
    # Add owner names
    user_ids = list(set(l.get("owner_id") for l in leads if l.get("owner_id")))
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    user_map = {u["id"]: u["name"] for u in users}
    
    for lead in leads:
        lead["owner_name"] = user_map.get(lead.get("owner_id"))
    
    return [LeadResponse(**l) for l in leads]

@api_router.get("/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Check access
    if user["role"] == UserRole.SALES.value and lead.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    owner = await db.users.find_one({"id": lead.get("owner_id")}, {"_id": 0, "name": 1})
    lead["owner_name"] = owner["name"] if owner else None

    return LeadResponse(**lead)

@api_router.put("/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: str, update: LeadUpdate, user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Check access
    if user["role"] == UserRole.SALES.value and lead.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Track stage changes for XP
    old_stage = lead.get("stage")
    stage_changed = update.stage is not None and update.stage.value != old_stage

    # Handle stage change to Closed Won
    if update.stage == LeadStage.CLOSED_WON and lead.get("stage") != LeadStage.CLOSED_WON.value:
        if update.final_value:
            update_data["final_value"] = update.final_value
        elif not lead.get("final_value"):
            update_data["final_value"] = lead.get("estimated_value", 0)

        # Notify admin
        admins = await db.users.find({"role": UserRole.ADMIN.value}, {"_id": 0, "id": 1}).to_list(10)
        for admin in admins:
            await create_notification(
                admin["id"],
                NotificationType.DEAL_WON,
                "Deal Closed Won!",
                f"{lead['company_name']} deal closed by {user['name']}",
                lead_id
            )

    await db.leads.update_one({"id": lead_id}, {"$set": update_data})

    # Award XP for stage updates
    lead_owner_id = lead.get("owner_id") or user["id"]
    if stage_changed:
        await award_xp(lead_owner_id, "stage_updated", f"{lead_id}:{update.stage.value}")
    if update.stage == LeadStage.CLOSED_WON and old_stage != LeadStage.CLOSED_WON.value:
        await award_xp(lead_owner_id, "deal_closed", lead_id)

    updated_lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    owner = await db.users.find_one({"id": updated_lead.get("owner_id")}, {"_id": 0, "name": 1})
    updated_lead["owner_name"] = owner["name"] if owner else None
    
    return LeadResponse(**updated_lead)

@api_router.put("/leads/{lead_id}/stage")
async def update_lead_stage(lead_id: str, stage: LeadStage, user: dict = Depends(get_current_user)):
    return await update_lead(lead_id, LeadUpdate(stage=stage), user)

@api_router.delete("/leads/{lead_id}")
async def delete_lead(
    lead_id: str,
    reason: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    lead = await db.leads.find_one({"id": lead_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Admins can delete any lead; sales reps can only delete their own assigned leads
    if user["role"] == UserRole.SALES.value and lead.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="You can only delete leads assigned to you")

    now = datetime.now(timezone.utc).isoformat()
    await db.leads.update_one(
        {"id": lead_id},
        {"$set": {
            "is_deleted": True,
            "deleted_at": now,
            "deleted_by": user["id"],
            "delete_reason": reason,
            "updated_at": now
        }}
    )
    return {"message": "Lead deleted successfully"}

# ==================== ACTIVITY ROUTES ====================
@api_router.post("/activities", response_model=ActivityResponse)
async def create_activity(activity: ActivityCreate, user: dict = Depends(get_current_user)):
    # Verify lead exists and user has access
    lead = await db.leads.find_one({"id": activity.lead_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if user["role"] == UserRole.SALES.value and lead.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    activity_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    activity_doc = {
        "id": activity_id,
        "lead_id": activity.lead_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "activity_type": activity.activity_type.value,
        "description": activity.description,
        "scheduled_at": activity.scheduled_at,
        "completed": activity.scheduled_at is None,
        "created_at": now
    }
    
    await db.activities.insert_one(activity_doc)

    # Award XP for logging an activity
    await award_xp(user["id"], "activity_logged", activity_id)

    # Create follow-up reminder notification
    if activity.scheduled_at and activity.activity_type == ActivityType.FOLLOW_UP:
        await create_notification(
            user["id"],
            NotificationType.FOLLOW_UP_REMINDER,
            "Follow-up Reminder",
            f"Follow-up scheduled for {lead['company_name']}",
            activity.lead_id
        )
    
    return ActivityResponse(**activity_doc)

@api_router.get("/activities", response_model=List[ActivityResponse])
async def get_activities(
    lead_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if lead_id:
        query["lead_id"] = lead_id
    
    if user["role"] == UserRole.SALES.value:
        query["user_id"] = user["id"]
    
    activities = await db.activities.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [ActivityResponse(**a) for a in activities]

@api_router.put("/activities/{activity_id}/complete")
async def complete_activity(activity_id: str, user: dict = Depends(get_current_user)):
    result = await db.activities.update_one(
        {"id": activity_id, "user_id": user["id"]},
        {"$set": {"completed": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"message": "Activity completed"}

# ==================== MEETING ROUTES ====================
@api_router.post("/meetings", response_model=MeetingResponse)
async def create_meeting(meeting: MeetingCreate, user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": meeting.lead_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if user["role"] == UserRole.SALES.value and lead.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    meeting_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    meeting_doc = {
        "id": meeting_id,
        "lead_id": meeting.lead_id,
        "lead_company": lead["company_name"],
        "user_id": user["id"],
        "user_name": user["name"],
        "meeting_type": meeting.meeting_type.value,
        "scheduled_at": meeting.scheduled_at,
        "outcome": meeting.outcome,
        "notes": meeting.notes,
        "next_action": meeting.next_action,
        "completed": False,
        "created_at": now
    }
    
    await db.meetings.insert_one(meeting_doc)

    # Award XP for booking a meeting
    await award_xp(user["id"], "meeting_booked", meeting_id)

    # Create meeting notification
    await create_notification(
        user["id"],
        NotificationType.MEETING_ALERT,
        "Meeting Scheduled",
        f"Meeting with {lead['company_name']} on {meeting.scheduled_at}",
        meeting.lead_id
    )
    
    return MeetingResponse(**meeting_doc)

@api_router.get("/meetings", response_model=List[MeetingResponse])
async def get_meetings(
    lead_id: Optional[str] = None,
    upcoming: bool = False,
    user: dict = Depends(get_current_user)
):
    query = {}
    if lead_id:
        query["lead_id"] = lead_id
    
    if user["role"] == UserRole.SALES.value:
        query["user_id"] = user["id"]
    
    if upcoming:
        query["completed"] = False
        query["scheduled_at"] = {"$gte": datetime.now(timezone.utc).isoformat()}
    
    meetings = await db.meetings.find(query, {"_id": 0}).sort("scheduled_at", 1).to_list(500)
    return [MeetingResponse(**m) for m in meetings]

@api_router.put("/meetings/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(meeting_id: str, update: MeetingUpdate, user: dict = Depends(get_current_user)):
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if user["role"] == UserRole.SALES.value and meeting.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if "meeting_type" in update_data:
        update_data["meeting_type"] = update_data["meeting_type"].value
    
    await db.meetings.update_one({"id": meeting_id}, {"$set": update_data})
    
    updated = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    return MeetingResponse(**updated)

# ==================== NOTIFICATION ROUTES ====================
async def create_notification(user_id: str, notification_type: NotificationType, title: str, message: str, lead_id: str = None):
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "notification_type": notification_type.value,
        "title": title,
        "message": message,
        "read": False,
        "lead_id": lead_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)

@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return [NotificationResponse(**n) for n in notifications]

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

# ==================== DASHBOARD ROUTES ====================
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    query = {"is_deleted": {"$ne": True}}
    if user["role"] == UserRole.SALES.value:
        query["owner_id"] = user["id"]

    leads = await db.leads.find(query, {"_id": 0}).to_list(10000)

    total_leads = len(leads)
    leads_by_stage = {}
    for stage in LeadStage:
        leads_by_stage[stage.value] = len([l for l in leads if l.get("stage") == stage.value])
    
    total_pipeline_value = sum(l.get("estimated_value", 0) for l in leads if l.get("stage") not in [LeadStage.CLOSED_WON.value, LeadStage.CLOSED_LOST.value])
    closed_won_leads = [l for l in leads if l.get("stage") == LeadStage.CLOSED_WON.value]
    closed_revenue = sum(l.get("final_value") or l.get("estimated_value", 0) for l in closed_won_leads)
    expected_revenue = sum(l.get("estimated_value", 0) for l in leads if l.get("stage") == LeadStage.NEGOTIATION.value)
    
    meetings_query = {} if user["role"] == UserRole.ADMIN.value else {"user_id": user["id"]}
    meetings_count = await db.meetings.count_documents(meetings_query)
    
    deals_closed_won = len(closed_won_leads)
    deals_closed_lost = len([l for l in leads if l.get("stage") == LeadStage.CLOSED_LOST.value])
    total_closed = deals_closed_won + deals_closed_lost
    conversion_rate = (deals_closed_won / total_closed * 100) if total_closed > 0 else 0
    
    return DashboardStats(
        total_leads=total_leads,
        leads_by_stage=leads_by_stage,
        total_pipeline_value=total_pipeline_value,
        closed_revenue=closed_revenue,
        expected_revenue=expected_revenue,
        meetings_booked=meetings_count,
        conversion_rate=round(conversion_rate, 1),
        deals_closed_won=deals_closed_won,
        deals_closed_lost=deals_closed_lost
    )

@api_router.get("/dashboard/performance", response_model=List[SalespersonPerformance])
async def get_team_performance(user: dict = Depends(get_admin_user)):
    sales_users = await db.users.find({"role": UserRole.SALES.value}, {"_id": 0}).to_list(100)
    
    performance = []
    for sales_user in sales_users:
        user_id = sales_user["id"]
        
        leads = await db.leads.find({"owner_id": user_id, "is_deleted": {"$ne": True}}, {"_id": 0}).to_list(10000)
        activities = await db.activities.count_documents({"user_id": user_id})
        meetings = await db.meetings.count_documents({"user_id": user_id})
        
        closed_won = [l for l in leads if l.get("stage") == LeadStage.CLOSED_WON.value]
        closed_lost = [l for l in leads if l.get("stage") == LeadStage.CLOSED_LOST.value]
        total_closed = len(closed_won) + len(closed_lost)
        
        revenue = sum(l.get("final_value") or l.get("estimated_value", 0) for l in closed_won)
        conversion = (len(closed_won) / total_closed * 100) if total_closed > 0 else 0
        
        performance.append(SalespersonPerformance(
            user_id=user_id,
            user_name=sales_user["name"],
            avatar_url=sales_user.get("avatar_url"),
            leads_added=len(leads),
            activities_logged=activities,
            meetings_booked=meetings,
            deals_closed=len(closed_won),
            revenue_generated=revenue,
            conversion_rate=round(conversion, 1)
        ))
    
    return sorted(performance, key=lambda x: x.revenue_generated, reverse=True)

# ==================== REPORTS ROUTES ====================
@api_router.get("/reports/leads")
async def get_leads_report(
    period: str = "week",  # day, week, month
    user: dict = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    if period == "day":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=now.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    else:  # month
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    query = {"created_at": {"$gte": start_date.isoformat()}, "is_deleted": {"$ne": True}}
    if user["role"] == UserRole.SALES.value:
        query["owner_id"] = user["id"]

    leads = await db.leads.find(query, {"_id": 0}).to_list(10000)
    
    # Get leads by owner
    leads_by_owner = {}
    for lead in leads:
        owner_id = lead.get("owner_id")
        if owner_id:
            if owner_id not in leads_by_owner:
                leads_by_owner[owner_id] = {"count": 0, "value": 0}
            leads_by_owner[owner_id]["count"] += 1
            leads_by_owner[owner_id]["value"] += lead.get("estimated_value", 0)
    
    # Get user names
    user_ids = list(leads_by_owner.keys())
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    user_map = {u["id"]: u["name"] for u in users}
    
    report = []
    for owner_id, data in leads_by_owner.items():
        report.append({
            "user_id": owner_id,
            "user_name": user_map.get(owner_id, "Unknown"),
            "leads_count": data["count"],
            "total_value": data["value"]
        })
    
    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "total_leads": len(leads),
        "total_value": sum(l.get("estimated_value", 0) for l in leads),
        "by_user": sorted(report, key=lambda x: x["leads_count"], reverse=True)
    }

@api_router.get("/reports/revenue")
async def get_revenue_report(
    period: str = "month",
    user: dict = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    if period == "day":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=now.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    else:  # month
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    query = {
        "stage": LeadStage.CLOSED_WON.value,
        "updated_at": {"$gte": start_date.isoformat()},
        "is_deleted": {"$ne": True}
    }
    if user["role"] == UserRole.SALES.value:
        query["owner_id"] = user["id"]

    deals = await db.leads.find(query, {"_id": 0}).to_list(10000)
    
    # Get revenue by owner
    revenue_by_owner = {}
    for deal in deals:
        owner_id = deal.get("owner_id")
        if owner_id:
            if owner_id not in revenue_by_owner:
                revenue_by_owner[owner_id] = {"count": 0, "revenue": 0}
            revenue_by_owner[owner_id]["count"] += 1
            revenue_by_owner[owner_id]["revenue"] += deal.get("final_value") or deal.get("estimated_value", 0)
    
    # Get user names
    user_ids = list(revenue_by_owner.keys())
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    user_map = {u["id"]: u["name"] for u in users}
    
    report = []
    for owner_id, data in revenue_by_owner.items():
        report.append({
            "user_id": owner_id,
            "user_name": user_map.get(owner_id, "Unknown"),
            "deals_closed": data["count"],
            "revenue": data["revenue"]
        })
    
    total_revenue = sum(d.get("final_value") or d.get("estimated_value", 0) for d in deals)
    
    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "total_deals": len(deals),
        "total_revenue": total_revenue,
        "by_user": sorted(report, key=lambda x: x["revenue"], reverse=True)
    }

@api_router.get("/reports/export")
async def export_leads(
    format: str = "csv",
    user: dict = Depends(get_current_user)
):
    query = {"is_deleted": {"$ne": True}}
    if user["role"] == UserRole.SALES.value:
        query["owner_id"] = user["id"]

    leads = await db.leads.find(query, {"_id": 0}).to_list(10000)

    # Get owner names
    user_ids = list(set(l.get("owner_id") for l in leads if l.get("owner_id")))
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    user_map = {u["id"]: u["name"] for u in users}

    export_data = []
    for lead in leads:
        export_data.append({
            "Company": lead.get("company_name"),
            "Contact": lead.get("contact_name"),
            "Email": lead.get("contact_email"),
            "Phone": lead.get("contact_phone"),
            "Stage": lead.get("stage"),
            "Source": lead.get("source"),
            "Owner": user_map.get(lead.get("owner_id"), ""),
            "Estimated Value": lead.get("estimated_value", 0),
            "Final Value": lead.get("final_value", ""),
            "Created": lead.get("created_at", "")[:10],
            "Updated": lead.get("updated_at", "")[:10]
        })
    
    return {"data": export_data, "count": len(export_data)}

# ==================== PIPELINE ROUTES ====================
@api_router.get("/pipeline")
async def get_pipeline(user: dict = Depends(get_current_user)):
    query = {"is_deleted": {"$ne": True}}
    if user["role"] == UserRole.SALES.value:
        query["owner_id"] = user["id"]

    leads = await db.leads.find(query, {"_id": 0}).to_list(10000)

    # Get owner names
    user_ids = list(set(l.get("owner_id") for l in leads if l.get("owner_id")))
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1, "avatar_url": 1}).to_list(100)
    user_map = {u["id"]: {"name": u["name"], "avatar_url": u.get("avatar_url")} for u in users}
    
    pipeline = {}
    for stage in LeadStage:
        pipeline[stage.value] = []
    
    for lead in leads:
        stage = lead.get("stage", LeadStage.LEAD_IDENTIFIED.value)
        owner_info = user_map.get(lead.get("owner_id"), {})
        lead["owner_name"] = owner_info.get("name")
        lead["owner_avatar"] = owner_info.get("avatar_url")
        if stage in pipeline:
            pipeline[stage].append(lead)
    
    return pipeline

@api_router.put("/pipeline/{lead_id}/move")
async def move_lead_in_pipeline(lead_id: str, stage: LeadStage, user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if user["role"] == UserRole.SALES.value and lead.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = {
        "stage": stage.value,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Handle closed won
    if stage == LeadStage.CLOSED_WON:
        if not lead.get("final_value"):
            update_data["final_value"] = lead.get("estimated_value", 0)
        
        # Notify admin
        admins = await db.users.find({"role": UserRole.ADMIN.value}, {"_id": 0, "id": 1}).to_list(10)
        for admin in admins:
            await create_notification(
                admin["id"],
                NotificationType.DEAL_WON,
                "Deal Closed Won!",
                f"{lead['company_name']} deal closed by {user['name']}",
                lead_id
            )
    
    await db.leads.update_one({"id": lead_id}, {"$set": update_data})

    # Award XP for stage update in pipeline
    old_stage = lead.get("stage")
    lead_owner_id = lead.get("owner_id") or user["id"]
    if stage.value != old_stage:
        await award_xp(lead_owner_id, "stage_updated", f"{lead_id}:{stage.value}")
    if stage == LeadStage.CLOSED_WON and old_stage != LeadStage.CLOSED_WON.value:
        await award_xp(lead_owner_id, "deal_closed", lead_id)

    return {"message": "Lead moved", "stage": stage.value}

# ==================== DAILY REPORT ROUTES ====================
class DailyReportCreate(BaseModel):
    date: str  # YYYY-MM-DD
    calls_made: int = 0
    messages_sent: int = 0
    follow_ups_made: int = 0
    meetings_set: int = 0
    meetings_attended: int = 0
    notes: Optional[str] = None

class DailyReportResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    avatar_url: Optional[str] = None
    date: str
    calls_made: int
    messages_sent: int
    follow_ups_made: int
    meetings_set: int
    meetings_attended: int
    notes: Optional[str] = None
    created_at: str
    updated_at: str

@api_router.post("/daily-reports", response_model=DailyReportResponse)
async def upsert_daily_report(report: DailyReportCreate, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.daily_reports.find_one({"user_id": user["id"], "date": report.date}, {"_id": 0})

    if existing:
        update_data = {**report.model_dump(), "updated_at": now}
        await db.daily_reports.update_one(
            {"user_id": user["id"], "date": report.date},
            {"$set": update_data}
        )
        updated = await db.daily_reports.find_one({"user_id": user["id"], "date": report.date}, {"_id": 0})
        return DailyReportResponse(**updated)
    else:
        report_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "user_name": user["name"],
            "avatar_url": user.get("avatar_url"),
            **report.model_dump(),
            "created_at": now,
            "updated_at": now
        }
        await db.daily_reports.insert_one(report_doc)
        return DailyReportResponse(**report_doc)

@api_router.get("/daily-reports", response_model=List[DailyReportResponse])
async def get_daily_reports(
    date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if user["role"] == UserRole.SALES.value:
        query["user_id"] = user["id"]
    if date:
        query["date"] = date

    reports = await db.daily_reports.find(query, {"_id": 0}).sort([("date", -1), ("user_name", 1)]).to_list(1000)
    return [DailyReportResponse(**r) for r in reports]

# ==================== LEVELS ROUTES ====================
@api_router.get("/levels/my-xp")
async def get_my_xp(user: dict = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0, "xp": 1, "level": 1})
    xp = user_doc.get("xp", 0) if user_doc else 0
    info = get_level_info(xp)
    recent_events = await db.xp_events.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return {**info, "recent_events": recent_events}

@api_router.get("/levels/leaderboard")
async def get_leaderboard(user: dict = Depends(get_current_user)):
    users = await db.users.find({}, {"_id": 0, "id": 1, "name": 1, "avatar_url": 1, "xp": 1, "level": 1}).to_list(100)
    leaderboard = []
    for u in users:
        xp = u.get("xp", 0)
        info = get_level_info(xp)
        leaderboard.append({
            "user_id": u["id"],
            "name": u["name"],
            "avatar_url": u.get("avatar_url"),
            **info,
        })
    leaderboard.sort(key=lambda x: x["xp"], reverse=True)
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1
    return leaderboard

# ==================== HEALTH CHECK ====================
@api_router.get("/")
async def root():
    return {"message": "Somvanshi CRM API", "status": "healthy"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router and middleware
app.include_router(api_router)
app.mount("/uploads", StaticFiles(directory=str(ROOT_DIR / "uploads")), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await seed_users()
    logger.info("Somvanshi CRM API started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
