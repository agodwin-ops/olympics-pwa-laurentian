from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, JSON, CheckConstraint, BigInteger, TypeDecorator
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


# Cross-database UUID type
class UUID(TypeDecorator):
    """Platform-independent UUID type.
    Uses PostgreSQL's UUID type when available, otherwise uses String.
    """
    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PostgreSQLUUID(as_uuid=True))
        else:
            return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value
        else:
            return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value
        else:
            return uuid.UUID(value) if isinstance(value, str) else value


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    profile_picture_url = Column(Text)
    user_program = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False, index=True)
    email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String(255))
    password_reset_token = Column(String(255))
    password_reset_expires = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_active = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    player_stats = relationship("PlayerStats", back_populates="user", uselist=False)
    player_skills = relationship("PlayerSkills", back_populates="user", uselist=False)
    player_inventory = relationship("PlayerInventory", back_populates="user", uselist=False)
    xp_entries = relationship("XPEntry", back_populates="user", foreign_keys="XPEntry.user_id")
    medals = relationship("Medal", back_populates="user")
    dice_rolls = relationship("DiceRoll", back_populates="user")


class Unit(Base):
    __tablename__ = "units"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    order_index = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(UUID(), ForeignKey("users.id"))

    # Relationships
    assignments = relationship("Assignment", back_populates="unit")
    lectures = relationship("Lecture", back_populates="unit")


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    unit_id = Column(UUID(), ForeignKey("units.id", ondelete="CASCADE"))
    max_xp = Column(Integer, nullable=False, default=100)
    created_by = Column(UUID(), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    unit = relationship("Unit", back_populates="assignments")
    xp_entries = relationship("XPEntry", back_populates="assignment")


class PlayerStats(Base):
    __tablename__ = "player_stats"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    current_xp = Column(Integer, default=0)
    total_xp = Column(Integer, default=0, index=True)
    current_level = Column(Integer, default=1)
    current_rank = Column(Integer, default=0, index=True)
    gameboard_xp = Column(Integer, default=0)
    gameboard_position = Column(Integer, default=1)
    gameboard_moves = Column(Integer, default=0)
    gold = Column(Integer, default=3)
    unit_xp = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="player_stats")


class PlayerSkills(Base):
    __tablename__ = "player_skills"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    strength = Column(Integer, default=1)
    endurance = Column(Integer, default=1)
    tactics = Column(Integer, default=1)
    climbing = Column(Integer, default=1)
    speed = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="player_skills")

    __table_args__ = (
        CheckConstraint('strength >= 1 AND strength <= 5', name='strength_range'),
        CheckConstraint('endurance >= 1 AND endurance <= 5', name='endurance_range'),
        CheckConstraint('tactics >= 1 AND tactics <= 5', name='tactics_range'),
        CheckConstraint('climbing >= 1 AND climbing <= 5', name='climbing_range'),
        CheckConstraint('speed >= 1 AND speed <= 5', name='speed_range'),
    )


class PlayerInventory(Base):
    __tablename__ = "player_inventory"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    water = Column(Integer, default=0)
    gatorade = Column(Integer, default=0)
    first_aid_kit = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="player_inventory")


class XPEntry(Base):
    __tablename__ = "xp_entries"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    amount = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False, index=True)  # 'assignment', 'bonus', 'gameboard', 'special'
    assignment_id = Column(UUID(), ForeignKey("assignments.id", ondelete="SET NULL"))
    assignment_name = Column(String(255))
    unit_id = Column(UUID(), ForeignKey("units.id", ondelete="SET NULL"))
    awarded_by = Column(UUID(), ForeignKey("users.id"))
    description = Column(Text)
    awarded_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("User", back_populates="xp_entries", foreign_keys=[user_id])
    assignment = relationship("Assignment", back_populates="xp_entries")

    __table_args__ = (
        CheckConstraint("type IN ('assignment', 'bonus', 'gameboard', 'special')", name='xp_type_check'),
    )


class Medal(Base):
    __tablename__ = "medals"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type = Column(String(10), nullable=False)  # 'gold', 'silver', 'bronze'
    category = Column(String(50), nullable=False)  # 'assignment', 'gameboard', 'special'
    description = Column(Text)
    earned_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="medals")

    __table_args__ = (
        CheckConstraint("type IN ('gold', 'silver', 'bronze')", name='medal_type_check'),
        CheckConstraint("category IN ('assignment', 'gameboard', 'special')", name='medal_category_check'),
    )


class GameboardStation(Base):
    __tablename__ = "gameboard_stations"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    narrative = Column(Text)
    required_skill = Column(String(50), nullable=False)
    completion_reward_xp = Column(Integer, default=0)
    completion_reward_items = Column(JSON, default={})
    position_x = Column(Integer, nullable=False)
    position_y = Column(Integer, nullable=False)

    # Relationships
    dice_rolls = relationship("DiceRoll", back_populates="station")

    __table_args__ = (
        CheckConstraint("required_skill IN ('Strength', 'Endurance', 'Tactics', 'Climbing', 'Jumping')", 
                       name='skill_type_check'),
    )


class DiceRoll(Base):
    __tablename__ = "dice_rolls"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    station_id = Column(Integer, ForeignKey("gameboard_stations.id"), index=True)
    skill_level = Column(Integer, nullable=False)
    success_chance = Column(Integer, nullable=False)
    roll_result = Column(Integer, nullable=False)
    was_successful = Column(Boolean, nullable=False)
    rolled_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="dice_rolls")
    station = relationship("GameboardStation", back_populates="dice_rolls")


class ResourceFolder(Base):
    __tablename__ = "resource_folders"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    parent_id = Column(UUID(), ForeignKey("resource_folders.id", ondelete="CASCADE"))
    created_by = Column(UUID(), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    files = relationship("ResourceFile", back_populates="folder")
    parent = relationship("ResourceFolder", remote_side=[id])


class ResourceFile(Base):
    __tablename__ = "resource_files"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    mime_type = Column(String(255))
    size_bytes = Column(BigInteger)
    file_path = Column(Text, nullable=False)
    folder_id = Column(UUID(), ForeignKey("resource_folders.id", ondelete="SET NULL"))
    uploaded_by = Column(UUID(), ForeignKey("users.id"))
    download_count = Column(Integer, default=0)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    folder = relationship("ResourceFolder", back_populates="files")


class AdminActivity(Base):
    __tablename__ = "admin_activity"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID(), ForeignKey("users.id"))
    action_type = Column(String(50), nullable=False)
    target_user_id = Column(UUID(), ForeignKey("users.id"))
    details = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Lecture(Base):
    __tablename__ = "lectures"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    unit_id = Column(UUID(), ForeignKey("units.id", ondelete="CASCADE"))
    order_index = Column(Integer, default=1)
    is_published = Column(Boolean, default=False)
    created_by = Column(UUID(), ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    unit = relationship("Unit", back_populates="lectures")
    creator = relationship("User")
    resources = relationship("LectureResource", back_populates="lecture", cascade="all, delete-orphan")


class LectureResource(Base):
    __tablename__ = "lecture_resources"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    lecture_id = Column(UUID(), ForeignKey("lectures.id", ondelete="CASCADE"))
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(100), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    file_path = Column(Text, nullable=False)
    description = Column(Text)
    is_public = Column(Boolean, default=True)
    uploaded_by = Column(UUID(), ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    lecture = relationship("Lecture", back_populates="resources")
    uploader = relationship("User")
    access_logs = relationship("FileAccessLog", back_populates="resource", cascade="all, delete-orphan")


class FileAccessLog(Base):
    __tablename__ = "file_access_logs"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(), ForeignKey("lecture_resources.id", ondelete="CASCADE"))
    user_id = Column(UUID(), ForeignKey("users.id", ondelete="CASCADE"))
    access_type = Column(String(50), default="download")
    ip_address = Column(String)
    user_agent = Column(Text)
    accessed_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    resource = relationship("LectureResource", back_populates="access_logs")
    user = relationship("User")