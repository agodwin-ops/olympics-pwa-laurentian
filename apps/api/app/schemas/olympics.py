from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum
import uuid


# Enums
class AwardType(str, Enum):
    xp = "xp"
    bonus_xp = "bonus_xp"
    gameboard_moves = "gameboard_moves"
    skill_points = "skill_points"
    gold = "gold"


class SkillType(str, Enum):
    strength = "Strength"
    endurance = "Endurance"
    tactics = "Tactics"
    climbing = "Climbing"
    speed = "Speed"


class XPType(str, Enum):
    assignment = "assignment"
    bonus = "bonus"
    gameboard = "gameboard"
    special = "special"


class MedalType(str, Enum):
    gold = "gold"
    silver = "silver"
    bronze = "bronze"


class MedalCategory(str, Enum):
    assignment = "assignment"
    gameboard = "gameboard"
    special = "special"


# Base schemas
class BaseSchema(BaseModel):
    class Config:
        from_attributes = True
        use_enum_values = True


# User schemas
class UserBase(BaseSchema):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    user_program: str = Field(..., min_length=1, max_length=255)


class UserCreate(UserBase):
    is_admin: bool = False
    admin_code: Optional[str] = None

    @validator('admin_code')
    def validate_admin_code(cls, v, values):
        if values.get('is_admin') and not v:
            raise ValueError('Admin code required for admin users')
        return v


class UserUpdate(BaseSchema):
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    user_program: Optional[str] = Field(None, min_length=1, max_length=255)
    profile_picture_url: Optional[str] = None


class User(UserBase):
    id: uuid.UUID
    profile_picture_url: Optional[str] = None
    is_admin: bool
    created_at: datetime
    updated_at: datetime
    last_active: datetime


# Authentication schemas
class LoginRequest(BaseSchema):
    email: EmailStr
    password: str


class AuthResponse(BaseSchema):
    access_token: str
    token_type: str = "bearer"
    user: User


# Player Stats schemas
class PlayerStatsBase(BaseSchema):
    current_xp: int = 0
    total_xp: int = 0
    current_level: int = 1
    current_rank: int = 0
    gameboard_xp: int = 0
    gameboard_position: int = 1
    gameboard_moves: int = 0
    gold: int = 0
    unit_xp: Dict[str, int] = {}


class PlayerStatsCreate(PlayerStatsBase):
    user_id: uuid.UUID


class PlayerStatsUpdate(BaseSchema):
    current_xp: Optional[int] = None
    total_xp: Optional[int] = None
    gameboard_xp: Optional[int] = None
    gameboard_position: Optional[int] = None
    gameboard_moves: Optional[int] = None
    gold: Optional[int] = None
    unit_xp: Optional[Dict[str, int]] = None


class PlayerStats(PlayerStatsBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# Player Skills schemas
class PlayerSkillsBase(BaseSchema):
    strength: int = Field(1, ge=1, le=5)
    endurance: int = Field(1, ge=1, le=5)
    tactics: int = Field(1, ge=1, le=5)
    climbing: int = Field(1, ge=1, le=5)
    speed: int = Field(1, ge=1, le=5)


class PlayerSkillsCreate(PlayerSkillsBase):
    user_id: uuid.UUID


class PlayerSkillsUpdate(BaseSchema):
    strength: Optional[int] = Field(None, ge=1, le=5)
    endurance: Optional[int] = Field(None, ge=1, le=5)
    tactics: Optional[int] = Field(None, ge=1, le=5)
    climbing: Optional[int] = Field(None, ge=1, le=5)
    speed: Optional[int] = Field(None, ge=1, le=5)


class PlayerSkills(PlayerSkillsBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# Player Inventory schemas
class PlayerInventoryBase(BaseSchema):
    water: int = 0
    gatorade: int = 0
    first_aid_kit: int = 0


class PlayerInventoryCreate(PlayerInventoryBase):
    user_id: uuid.UUID


class PlayerInventoryUpdate(BaseSchema):
    water: Optional[int] = Field(None, ge=0)
    gatorade: Optional[int] = Field(None, ge=0)
    first_aid_kit: Optional[int] = Field(None, ge=0)


class PlayerInventory(PlayerInventoryBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# XP Entry schemas
class XPEntryBase(BaseSchema):
    amount: int = Field(..., gt=0)
    type: XPType
    assignment_id: Optional[uuid.UUID] = None
    assignment_name: Optional[str] = None
    unit_id: Optional[uuid.UUID] = None
    description: Optional[str] = None


class XPEntryCreate(XPEntryBase):
    user_id: uuid.UUID
    awarded_by: uuid.UUID


class XPEntry(XPEntryBase):
    id: uuid.UUID
    user_id: uuid.UUID
    awarded_by: uuid.UUID
    awarded_at: datetime


# Medal schemas
class MedalBase(BaseSchema):
    type: MedalType
    category: MedalCategory
    description: Optional[str] = None


class MedalCreate(MedalBase):
    user_id: uuid.UUID


class Medal(MedalBase):
    id: uuid.UUID
    user_id: uuid.UUID
    earned_at: datetime


# Unit schemas
class UnitBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    order_index: int
    is_active: bool = True


class UnitCreate(UnitBase):
    created_by: Optional[uuid.UUID] = None


class Unit(UnitBase):
    id: uuid.UUID
    created_by: Optional[uuid.UUID]
    created_at: datetime


# Assignment schemas
class AssignmentBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    max_xp: int = Field(100, gt=0)


class AssignmentCreate(AssignmentBase):
    unit_id: uuid.UUID
    created_by: Optional[uuid.UUID] = None


class Assignment(AssignmentBase):
    id: uuid.UUID
    unit_id: uuid.UUID
    created_by: Optional[uuid.UUID]
    created_at: datetime


# Gameboard schemas
class GameboardStationBase(BaseSchema):
    name: str
    description: Optional[str] = None
    narrative: Optional[str] = None
    required_skill: SkillType
    completion_reward_xp: int = 0
    completion_reward_items: Dict[str, Any] = {}
    position_x: int
    position_y: int


class GameboardStation(GameboardStationBase):
    id: int


class DiceRollBase(BaseSchema):
    station_id: int
    skill_level: int = Field(..., ge=1, le=5)
    success_chance: int = Field(..., ge=0, le=100)
    roll_result: int = Field(..., ge=1, le=100)
    was_successful: bool


class DiceRollCreate(DiceRollBase):
    user_id: uuid.UUID


class DiceRoll(DiceRollBase):
    id: uuid.UUID
    user_id: uuid.UUID
    rolled_at: datetime


# Admin Award schemas
class AdminAwardRequest(BaseSchema):
    type: AwardType
    target_user_id: uuid.UUID
    amount: int = Field(..., gt=0)
    assignment_id: Optional[uuid.UUID] = None
    skill_type: Optional[SkillType] = None
    description: Optional[str] = None

    @validator('amount')
    def validate_amount(cls, v, values):
        if values.get('type') == AwardType.skill_points and v > 5:
            raise ValueError('Skill points cannot exceed 5 levels')
        return v

    @validator('assignment_id')
    def validate_assignment_id(cls, v, values):
        if values.get('type') == AwardType.xp and not v:
            raise ValueError('Assignment ID required for XP awards')
        return v

    @validator('skill_type')
    def validate_skill_type(cls, v, values):
        if values.get('type') == AwardType.skill_points and not v:
            raise ValueError('Skill type required for skill point awards')
        return v


class BulkAwardRequest(BaseSchema):
    awards: List[AdminAwardRequest] = Field(..., min_items=1)


# Leaderboard schemas
class LeaderboardEntry(BaseSchema):
    id: uuid.UUID
    username: str
    user_program: str
    profile_picture_url: Optional[str]
    total_xp: int
    current_level: int
    current_rank: int
    gameboard_xp: int
    gameboard_position: int
    gold: int
    medal_tier: Optional[str] = None


class Leaderboard(BaseSchema):
    overall: List[LeaderboardEntry]
    gameboard: List[LeaderboardEntry]
    unit: List[LeaderboardEntry]
    last_updated: datetime


# Complete Player Profile schemas
class CompletePlayerProfile(BaseSchema):
    user: User
    stats: PlayerStats
    skills: PlayerSkills
    inventory: PlayerInventory
    recent_xp: List[XPEntry]
    medals: List[Medal]


# Admin Statistics schemas
class AdminStats(BaseSchema):
    total_students: int
    total_xp_awarded: int
    total_gold_awarded: int
    active_students_count: int
    average_level: float
    most_active_unit: Optional[str]
    recent_activity: List[XPEntry]


# API Response schemas
class APIResponse(BaseSchema):
    success: bool
    message: Optional[str] = None
    data: Optional[Any] = None


class PaginatedResponse(BaseSchema):
    success: bool
    data: List[Any]
    total: int
    page: int
    limit: int
    total_pages: int


# Lecture schemas
class LectureBase(BaseSchema):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    unit_id: Optional[uuid.UUID] = None
    order_index: int = 1
    is_published: bool = False


class LectureCreate(LectureBase):
    created_by: uuid.UUID


class LectureUpdate(BaseSchema):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    unit_id: Optional[uuid.UUID] = None
    order_index: Optional[int] = None
    is_published: Optional[bool] = None


class Lecture(LectureBase):
    id: uuid.UUID
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime


class LectureWithResources(Lecture):
    resources: List['LectureResource'] = []


# Lecture Resource schemas
class LectureResourceBase(BaseSchema):
    filename: str = Field(..., max_length=255)
    original_filename: str = Field(..., max_length=255)
    file_type: str = Field(..., max_length=100)
    file_size: int = Field(..., gt=0)
    file_path: str
    description: Optional[str] = None
    is_public: bool = True


class LectureResourceCreate(BaseSchema):
    lecture_id: uuid.UUID
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    file_path: str
    description: Optional[str] = None
    is_public: bool = True
    uploaded_by: uuid.UUID


class LectureResource(LectureResourceBase):
    id: uuid.UUID
    lecture_id: uuid.UUID
    uploaded_by: uuid.UUID
    created_at: datetime


# File Upload schemas
class FileUploadRequest(BaseSchema):
    lecture_id: uuid.UUID
    description: Optional[str] = None
    is_public: bool = True


class FileUploadResponse(BaseSchema):
    success: bool
    resource: Optional[LectureResource] = None
    message: Optional[str] = None


# File Access Log schemas
class FileAccessLogCreate(BaseSchema):
    resource_id: uuid.UUID
    user_id: uuid.UUID
    access_type: str = "download"
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class FileAccessLog(BaseSchema):
    id: uuid.UUID
    resource_id: uuid.UUID
    user_id: uuid.UUID
    access_type: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    accessed_at: datetime