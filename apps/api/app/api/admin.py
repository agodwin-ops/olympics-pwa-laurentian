from fastapi import APIRouter, Depends, HTTPException, status, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.olympics import (
    User, PlayerStats, PlayerSkills, PlayerInventory, 
    XPEntry, Assignment, Unit, AdminActivity
)
from app.schemas.olympics import (
    AdminAwardRequest, BulkAwardRequest, APIResponse, 
    AdminStats, LeaderboardEntry, XPEntry as XPEntrySchema,
    User as UserSchema, PlayerStats as PlayerStatsSchema,
    Assignment as AssignmentSchema, Unit as UnitSchema,
    AwardType, SkillType, XPType
)
from app.api.auth import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/award", response_model=APIResponse)
@limiter.limit("30/minute")  # Limit admin award actions
async def award_student(
    request: Request,
    award: AdminAwardRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Award a single student with XP, skills, gold, or gameboard moves"""
    
    # Verify target user exists
    target_user = db.query(User).filter(User.id == award.target_user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Get player stats (create if doesn't exist)
    player_stats = db.query(PlayerStats).filter(PlayerStats.user_id == award.target_user_id).first()
    if not player_stats:
        player_stats = PlayerStats(user_id=award.target_user_id)
        db.add(player_stats)
        db.flush()
    
    # Process award based on type
    if award.type == AwardType.xp:
        # Validate assignment exists
        assignment = db.query(Assignment).filter(Assignment.id == award.assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        # Update player stats
        player_stats.current_xp += award.amount
        player_stats.total_xp += award.amount
        
        # Update unit XP tracking
        if not player_stats.unit_xp:
            player_stats.unit_xp = {}
        unit_key = str(assignment.unit_id)
        player_stats.unit_xp[unit_key] = player_stats.unit_xp.get(unit_key, 0) + award.amount
        
        # Create XP entry
        xp_entry = XPEntry(
            user_id=award.target_user_id,
            amount=award.amount,
            type=XPType.assignment,
            assignment_id=award.assignment_id,
            assignment_name=assignment.name,
            unit_id=assignment.unit_id,
            awarded_by=current_admin.id,
            description=award.description or f"Completed {assignment.name}"
        )
        db.add(xp_entry)
        
    elif award.type == AwardType.bonus_xp:
        # Update player stats
        player_stats.current_xp += award.amount
        player_stats.total_xp += award.amount
        
        # Create XP entry
        xp_entry = XPEntry(
            user_id=award.target_user_id,
            amount=award.amount,
            type=XPType.bonus,
            awarded_by=current_admin.id,
            description=award.description or f"Bonus XP award"
        )
        db.add(xp_entry)
        
    elif award.type == AwardType.gameboard_moves:
        # Update gameboard moves
        player_stats.gameboard_moves += award.amount
        
    elif award.type == AwardType.gold:
        # Update gold
        player_stats.gold += award.amount
        
    elif award.type == AwardType.skill_points:
        # Get player skills
        player_skills = db.query(PlayerSkills).filter(PlayerSkills.user_id == award.target_user_id).first()
        if not player_skills:
            player_skills = PlayerSkills(user_id=award.target_user_id)
            db.add(player_skills)
            db.flush()
        
        # Update skill
        current_level = getattr(player_skills, award.skill_type.value.lower())
        new_level = min(5, current_level + award.amount)
        setattr(player_skills, award.skill_type.value.lower(), new_level)
    
    # Log admin activity
    admin_activity = AdminActivity(
        admin_id=current_admin.id,
        action_type=f"award_{award.type}",
        target_user_id=award.target_user_id,
        details={
            "award_type": award.type,
            "amount": award.amount,
            "assignment_id": str(award.assignment_id) if award.assignment_id else None,
            "skill_type": award.skill_type.value if award.skill_type else None,
            "description": award.description
        }
    )
    db.add(admin_activity)
    
    db.commit()
    
    # Send real-time notifications
    try:
        from app.api.realtime import notify_award_received, notify_leaderboard_update, get_leaderboard_data
        import asyncio
        
        # Notify the awarded user
        asyncio.create_task(notify_award_received(str(award.target_user_id), {
            "type": award.type.value,
            "amount": award.amount,
            "description": award.description,
            "awarded_by": current_admin.username
        }))
        
        # Update leaderboard if XP was awarded
        if award.type in [AwardType.xp, AwardType.bonus_xp]:
            leaderboard_data = await get_leaderboard_data(db)
            asyncio.create_task(notify_leaderboard_update(leaderboard_data))
            
    except Exception as e:
        # Don't fail the award if real-time notification fails
        import logging
        logging.error(f"Failed to send real-time notification: {e}")
    
    return APIResponse(
        success=True,
        message=f"Successfully awarded {award.amount} {award.type} to {target_user.username}"
    )


@router.post("/bulk-award", response_model=APIResponse)
@limiter.limit("10/minute")  # Limit bulk award actions
async def bulk_award_students(
    request: Request,
    bulk_award: BulkAwardRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Award multiple students simultaneously"""
    
    successful_awards = 0
    failed_awards = []
    
    for award in bulk_award.awards:
        try:
            # Process each award individually
            await award_student(award, current_admin, db)
            successful_awards += 1
        except Exception as e:
            failed_awards.append({
                "user_id": str(award.target_user_id),
                "error": str(e)
            })
    
    message = f"Successfully awarded {successful_awards} students"
    if failed_awards:
        message += f", {len(failed_awards)} failed"
    
    return APIResponse(
        success=True,
        message=message,
        data={"successful": successful_awards, "failed": failed_awards}
    )


@router.get("/students", response_model=List[dict])
async def get_all_students(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all students with their stats for admin overview"""
    
    students = db.query(User).filter(User.is_admin == False).all()
    
    result = []
    for student in students:
        student_dict = UserSchema.from_orm(student).dict()
        
        # Get stats
        stats = db.query(PlayerStats).filter(PlayerStats.user_id == student.id).first()
        if stats:
            student_dict["stats"] = PlayerStatsSchema.from_orm(stats).dict()
        
        # Get skills
        skills = db.query(PlayerSkills).filter(PlayerSkills.user_id == student.id).first()
        if skills:
            student_dict["skills"] = {
                "strength": skills.strength,
                "endurance": skills.endurance,
                "tactics": skills.tactics,
                "climbing": skills.climbing,
                "speed": skills.speed
            }
        
        result.append(student_dict)
    
    return result


@router.get("/stats")
async def get_admin_statistics(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get overall admin statistics"""
    try:
        from sqlalchemy import func
        from datetime import datetime, timedelta
        
        # Total students
        total_students = db.query(User).filter(User.is_admin == False).count()
        
        # Total XP and gold from player stats
        total_xp_result = db.query(func.sum(PlayerStats.total_xp)).scalar()
        total_xp = int(total_xp_result) if total_xp_result else 0
        
        total_gold_result = db.query(func.sum(PlayerStats.gold)).scalar()
        total_gold = int(total_gold_result) if total_gold_result else 0
        
        # Active students (active in last 24 hours)
        twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
        active_students = db.query(User).filter(
            User.is_admin == False,
            User.last_active >= twenty_four_hours_ago
        ).count()
        
        # Average level
        avg_level_result = db.query(func.avg(PlayerStats.current_level)).scalar()
        avg_level = float(avg_level_result) if avg_level_result else 1.0
        
        # Most active unit (placeholder since we may not have XP entries)
        most_active_unit = "Quest 1: Prenatal & Infant Development"
        
        # Recent activity (mock data since we may not have XP entries)
        recent_activity = [
            {
                "id": "1",
                "user_id": "sample",
                "amount": 100,
                "type": "assignment",
                "description": "Sample XP award",
                "awarded_at": datetime.utcnow().isoformat()
            }
        ]
        
        return {
            "success": True,
            "data": {
                "total_students": total_students,
                "total_xp_awarded": total_xp,
                "total_gold_awarded": total_gold,
                "active_students_count": active_students,
                "average_level": avg_level,
                "most_active_unit": most_active_unit,
                "recent_activity": recent_activity
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting admin stats: {e}")
        return {
            "success": False,
            "error": "Failed to get admin statistics",
            "data": {
                "total_students": 0,
                "total_xp_awarded": 0,
                "total_gold_awarded": 0,
                "active_students_count": 0,
                "average_level": 1.0,
                "most_active_unit": None,
                "recent_activity": []
            }
        }


@router.get("/assignments", response_model=List[AssignmentSchema])
async def get_assignments(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all assignments for award dropdowns"""
    
    assignments = db.query(Assignment).order_by(Assignment.created_at).all()
    return [AssignmentSchema.from_orm(assignment) for assignment in assignments]


@router.get("/units", response_model=List[UnitSchema])
async def get_units(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all units"""
    
    units = db.query(Unit).order_by(Unit.order_index).all()
    return [UnitSchema.from_orm(unit) for unit in units]


@router.get("/activity-log")
async def get_admin_activity_log(
    limit: int = 50,
    offset: int = 0,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get admin activity log"""
    
    activities = db.query(AdminActivity).order_by(
        desc(AdminActivity.created_at)
    ).offset(offset).limit(limit).all()
    
    result = []
    for activity in activities:
        admin_user = db.query(User).filter(User.id == activity.admin_id).first()
        target_user = db.query(User).filter(User.id == activity.target_user_id).first()
        
        result.append({
            "id": activity.id,
            "admin_username": admin_user.username if admin_user else "Unknown",
            "action_type": activity.action_type,
            "target_username": target_user.username if target_user else "Unknown",
            "details": activity.details,
            "created_at": activity.created_at
        })
    
    return {"activities": result}


@router.delete("/reset-student/{student_id}", response_model=APIResponse)
@limiter.limit("5/minute")  # Limit dangerous reset operations
async def reset_student_progress(
    request: Request,
    student_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Reset a student's progress (nuclear option)"""
    
    # Verify student exists
    student = db.query(User).filter(User.id == student_id, User.is_admin == False).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Reset player stats
    player_stats = db.query(PlayerStats).filter(PlayerStats.user_id == student_id).first()
    if player_stats:
        player_stats.current_xp = 0
        player_stats.total_xp = 0
        player_stats.current_level = 1
        player_stats.current_rank = 0
        player_stats.gameboard_xp = 0
        player_stats.gameboard_position = 1
        player_stats.gameboard_moves = 0
        player_stats.gold = 0
        player_stats.unit_xp = {}
    
    # Reset player skills
    player_skills = db.query(PlayerSkills).filter(PlayerSkills.user_id == student_id).first()
    if player_skills:
        player_skills.strength = 1
        player_skills.endurance = 1
        player_skills.tactics = 1
        player_skills.climbing = 1
        player_skills.speed = 1
    
    # Reset inventory
    player_inventory = db.query(PlayerInventory).filter(PlayerInventory.user_id == student_id).first()
    if player_inventory:
        player_inventory.water = 0
        player_inventory.gatorade = 0
        player_inventory.first_aid_kit = 0
    
    # Log admin activity
    admin_activity = AdminActivity(
        admin_id=current_admin.id,
        action_type="reset_student",
        target_user_id=student_id,
        details={"action": "full_progress_reset"}
    )
    db.add(admin_activity)
    
    db.commit()
    
    return APIResponse(
        success=True,
        message=f"Successfully reset progress for {student.username}"
    )