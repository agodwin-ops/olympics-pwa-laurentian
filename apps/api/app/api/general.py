from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.olympics import User, Assignment, Unit
from typing import List
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/assignments")
async def get_all_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all assignments (general endpoint)"""
    try:
        # Try to get assignments from database first
        assignments = db.query(Assignment).all()
        
        if assignments:
            assignment_list = []
            for assignment in assignments:
                assignment_list.append({
                    "id": assignment.id,
                    "name": assignment.name,
                    "description": assignment.description,
                    "max_xp": assignment.max_xp,
                    "unit_id": assignment.unit_id,
                    "created_by": assignment.created_by,
                    "created_at": assignment.created_at
                })
            
            return {"success": True, "data": assignment_list}
        else:
            # Return sample assignments if none in database
            sample_assignments = [
                {
                    "id": "quest1-final",
                    "name": "Quest 1 Final Assessment",
                    "description": "Comprehensive assessment of prenatal and infant development",
                    "max_xp": 100,
                    "unit_id": "quest1",
                    "quest_type": 1,
                    "created_at": "2024-08-01T00:00:00Z"
                },
                {
                    "id": "reflexes-analysis",
                    "name": "Reflexes Analysis Paper",
                    "description": "Analysis of primitive reflexes in newborns",
                    "max_xp": 75,
                    "unit_id": "quest1",
                    "quest_type": 1,
                    "created_at": "2024-08-05T00:00:00Z"
                },
                {
                    "id": "motor-skills-project",
                    "name": "Motor Skills Development Project",
                    "description": "Project on gross and fine motor skill development",
                    "max_xp": 85,
                    "unit_id": "quest2",
                    "quest_type": 2,
                    "created_at": "2024-08-10T00:00:00Z"
                },
                {
                    "id": "cognitive-assessment",
                    "name": "Cognitive Development Assessment",
                    "description": "Evaluation of cognitive milestones in early childhood",
                    "max_xp": 90,
                    "unit_id": "quest2",
                    "quest_type": 2,
                    "created_at": "2024-08-15T00:00:00Z"
                },
                {
                    "id": "social-emotional-study",
                    "name": "Social-Emotional Development Study",
                    "description": "Research project on social and emotional development",
                    "max_xp": 95,
                    "unit_id": "quest3",
                    "quest_type": 3,
                    "created_at": "2024-08-20T00:00:00Z"
                }
            ]
            
            return {"success": True, "data": sample_assignments}
        
    except Exception as e:
        logger.error(f"Error getting assignments: {e}")
        raise HTTPException(status_code=500, detail="Failed to get assignments")

@router.get("/units")
async def get_all_units(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all units (general endpoint)"""
    try:
        # Try to get units from database first
        units = db.query(Unit).all()
        
        if units:
            unit_list = []
            for unit in units:
                unit_list.append({
                    "id": unit.id,
                    "name": unit.name,
                    "description": unit.description,
                    "order_index": unit.order_index,
                    "is_active": unit.is_active,
                    "created_by": unit.created_by,
                    "created_at": unit.created_at
                })
            
            return {"success": True, "data": unit_list}
        else:
            # Return sample units if none in database
            sample_units = [
                {
                    "id": "quest1",
                    "name": "Quest 1: Prenatal & Infant Development",
                    "description": "Study of development from conception through infancy",
                    "order_index": 1,
                    "is_active": True,
                    "created_at": "2024-08-01T00:00:00Z"
                },
                {
                    "id": "quest2",
                    "name": "Quest 2: Early Childhood Development",
                    "description": "Motor and cognitive development in early childhood",
                    "order_index": 2,
                    "is_active": True,
                    "created_at": "2024-08-01T00:00:00Z"
                },
                {
                    "id": "quest3",
                    "name": "Quest 3: Social & Emotional Development",
                    "description": "Social-emotional milestones and attachment theory",
                    "order_index": 3,
                    "is_active": True,
                    "created_at": "2024-08-01T00:00:00Z"
                }
            ]
            
            return {"success": True, "data": sample_units}
        
    except Exception as e:
        logger.error(f"Error getting units: {e}")
        raise HTTPException(status_code=500, detail="Failed to get units")

@router.get("/assignments/{assignment_id}")
async def get_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get specific assignment by ID"""
    try:
        assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
        
        if not assignment:
            # Return sample assignment if not found in database
            sample_assignment = {
                "id": assignment_id,
                "name": f"Assignment {assignment_id}",
                "description": "Sample assignment for demonstration",
                "max_xp": 100,
                "unit_id": "quest1",
                "created_at": "2024-08-01T00:00:00Z"
            }
            return {"success": True, "data": sample_assignment}
        
        assignment_data = {
            "id": assignment.id,
            "name": assignment.name,
            "description": assignment.description,
            "max_xp": assignment.max_xp,
            "unit_id": assignment.unit_id,
            "created_by": assignment.created_by,
            "created_at": assignment.created_at
        }
        
        return {"success": True, "data": assignment_data}
        
    except Exception as e:
        logger.error(f"Error getting assignment {assignment_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get assignment")