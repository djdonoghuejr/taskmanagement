from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..config import SYSTEM_USER_ID
from ..database import get_db
from ..models.tag import Tag
from ..schemas.tag import TagCreate, TagRead, TagUpdate

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.get("", response_model=List[TagRead])
def list_tags(db: Session = Depends(get_db)):
    return (
        db.query(Tag)
        .filter(Tag.user_id == SYSTEM_USER_ID, Tag.is_archived == False)
        .order_by(Tag.name.asc())
        .all()
    )


@router.post("", response_model=TagRead)
def create_tag(payload: TagCreate, db: Session = Depends(get_db)):
    tag = Tag(
        user_id=SYSTEM_USER_ID,
        name=payload.name,
        color=payload.color,
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.put("/{tag_id}", response_model=TagRead)
def update_tag(tag_id: UUID, payload: TagUpdate, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == SYSTEM_USER_ID).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tag, field, value)

    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}")
def delete_tag(tag_id: UUID, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == SYSTEM_USER_ID).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    tag.is_archived = True
    db.commit()
    return {"ok": True}
