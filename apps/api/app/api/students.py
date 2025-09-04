from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.olympics import (
    User, PlayerStats, PlayerSkills, PlayerInventory, XPEntry, 
    Medal, GameboardStation, DiceRoll, Assignment, Unit
)
from app.schemas.olympics import (
    CompletePlayerProfile, LeaderboardEntry, Leaderboard,
    PlayerStats as PlayerStatsSchema, PlayerSkills as PlayerSkillsSchema,
    PlayerInventory as PlayerInventorySchema, XPEntry as XPEntrySchema,
    Medal as MedalSchema, GameboardStation as GameboardStationSchema,
    DiceRoll as DiceRollSchema, DiceRollCreate, APIResponse,
    Assignment as AssignmentSchema, Unit as UnitSchema
)
from app.api.auth import get_current_user

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("/me/profile", response_model=CompletePlayerProfile)
async def get_my_complete_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get complete profile for current user"""
    
    # Get player stats
    stats = db.query(PlayerStats).filter(PlayerStats.user_id == current_user.id).first()
    if not stats:
        stats = PlayerStats(user_id=current_user.id)
        db.add(stats)
        db.commit()
        db.refresh(stats)
    
    # Get player skills
    skills = db.query(PlayerSkills).filter(PlayerSkills.user_id == current_user.id).first()
    if not skills:
        skills = PlayerSkills(user_id=current_user.id)
        db.add(skills)
        db.commit()
        db.refresh(skills)
    
    # Get player inventory
    inventory = db.query(PlayerInventory).filter(PlayerInventory.user_id == current_user.id).first()
    if not inventory:
        inventory = PlayerInventory(user_id=current_user.id)
        db.add(inventory)
        db.commit()
        db.refresh(inventory)
    
    # Get recent XP entries (last 10)
    recent_xp = db.query(XPEntry).filter(
        XPEntry.user_id == current_user.id
    ).order_by(desc(XPEntry.awarded_at)).limit(10).all()
    
    # Get medals
    medals = db.query(Medal).filter(Medal.user_id == current_user.id).all()
    
    return CompletePlayerProfile(
        user=current_user,
        stats=PlayerStatsSchema.from_orm(stats),
        skills=PlayerSkillsSchema.from_orm(skills),
        inventory=PlayerInventorySchema.from_orm(inventory),
        recent_xp=[XPEntrySchema.from_orm(xp) for xp in recent_xp],
        medals=[MedalSchema.from_orm(medal) for medal in medals]
    )


@router.get("/me/stats", response_model=PlayerStatsSchema)
async def get_my_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's stats"""
    
    stats = db.query(PlayerStats).filter(PlayerStats.user_id == current_user.id).first()
    if not stats:
        stats = PlayerStats(user_id=current_user.id)
        db.add(stats)
        db.commit()
        db.refresh(stats)
    
    return PlayerStatsSchema.from_orm(stats)


@router.get("/me/skills", response_model=PlayerSkillsSchema)
async def get_my_skills(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's skills"""
    
    skills = db.query(PlayerSkills).filter(PlayerSkills.user_id == current_user.id).first()
    if not skills:
        skills = PlayerSkills(user_id=current_user.id)
        db.add(skills)
        db.commit()
        db.refresh(skills)
    
    return PlayerSkillsSchema.from_orm(skills)


@router.get("/me/inventory", response_model=PlayerInventorySchema)
async def get_my_inventory(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's inventory"""
    
    inventory = db.query(PlayerInventory).filter(PlayerInventory.user_id == current_user.id).first()
    if not inventory:
        inventory = PlayerInventory(user_id=current_user.id)
        db.add(inventory)
        db.commit()
        db.refresh(inventory)
    
    return PlayerInventorySchema.from_orm(inventory)


@router.get("/me/xp-history", response_model=List[XPEntrySchema])
async def get_my_xp_history(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get XP history for current user"""
    
    xp_entries = db.query(XPEntry).filter(
        XPEntry.user_id == current_user.id
    ).order_by(desc(XPEntry.awarded_at)).offset(offset).limit(limit).all()
    
    return [XPEntrySchema.from_orm(xp) for xp in xp_entries]


# REMOVED: Leaderboard endpoint removed for student privacy
# Students should not be able to view other students' data


@router.get("/gameboard/stations", response_model=List[GameboardStationSchema])
async def get_gameboard_stations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all gameboard stations"""
    
    stations = db.query(GameboardStation).order_by(GameboardStation.id).all()
    return [GameboardStationSchema.from_orm(station) for station in stations]


@router.post("/gameboard/roll-dice", response_model=APIResponse)
async def roll_dice(
    dice_roll: DiceRollCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Roll dice at a gameboard station"""
    
    # Verify user has gameboard moves
    player_stats = db.query(PlayerStats).filter(PlayerStats.user_id == current_user.id).first()
    if not player_stats or player_stats.gameboard_moves <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No gameboard moves available"
        )
    
    # Verify station exists
    station = db.query(GameboardStation).filter(GameboardStation.id == dice_roll.station_id).first()
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found"
        )
    
    # Get current skill level for required skill
    player_skills = db.query(PlayerSkills).filter(PlayerSkills.user_id == current_user.id).first()
    if not player_skills:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Player skills not found"
        )
    
    skill_level = getattr(player_skills, station.required_skill.lower())
    success_chance = skill_level * 20  # 20% per skill level
    
    # Simulate dice roll (1-100)
    import random
    roll_result = random.randint(1, 100)
    was_successful = roll_result <= success_chance
    
    # Create dice roll record
    dice_roll_record = DiceRoll(
        user_id=current_user.id,
        station_id=dice_roll.station_id,
        skill_level=skill_level,
        success_chance=success_chance,
        roll_result=roll_result,
        was_successful=was_successful
    )
    db.add(dice_roll_record)
    
    # Consume gameboard move
    player_stats.gameboard_moves -= 1
    
    # If successful, award station rewards
    message = f"Rolled {roll_result}! "
    if was_successful:
        # Award XP
        if station.completion_reward_xp > 0:
            player_stats.gameboard_xp += station.completion_reward_xp
            player_stats.total_xp += station.completion_reward_xp
            player_stats.current_xp += station.completion_reward_xp
            
            # Create XP entry
            xp_entry = XPEntry(
                user_id=current_user.id,
                amount=station.completion_reward_xp,
                type="gameboard",
                description=f"Completed {station.name}"
            )
            db.add(xp_entry)
        
        # Award items (if any)
        if station.completion_reward_items:
            inventory = db.query(PlayerInventory).filter(PlayerInventory.user_id == current_user.id).first()
            if inventory:
                for item, quantity in station.completion_reward_items.items():
                    if hasattr(inventory, item):
                        current_quantity = getattr(inventory, item)
                        setattr(inventory, item, current_quantity + quantity)
        
        # Advance position if this is their current station
        if player_stats.gameboard_position == dice_roll.station_id:
            player_stats.gameboard_position = min(10, player_stats.gameboard_position + 1)
        
        message += f"SUCCESS! Completed {station.name}."
        if station.completion_reward_xp > 0:
            message += f" Earned {station.completion_reward_xp} XP."
    else:
        message += f"Failed to complete {station.name}. Try again with better skills!"
    
    db.commit()
    
    return APIResponse(
        success=True,
        message=message,
        data={
            "roll_result": roll_result,
            "success_chance": success_chance,
            "was_successful": was_successful,
            "moves_remaining": player_stats.gameboard_moves
        }
    )


@router.get("/assignments", response_model=List[AssignmentSchema])
async def get_assignments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all available assignments"""
    
    assignments = db.query(Assignment).order_by(Assignment.created_at).all()
    return [AssignmentSchema.from_orm(assignment) for assignment in assignments]


@router.get("/units", response_model=List[UnitSchema])
async def get_units(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all learning units"""
    
    units = db.query(Unit).filter(Unit.is_active == True).order_by(Unit.order_index).all()
    return [UnitSchema.from_orm(unit) for unit in units]


# REMOVED: Student profile viewing endpoint removed for privacy
# Students should only be able to view their own profile data