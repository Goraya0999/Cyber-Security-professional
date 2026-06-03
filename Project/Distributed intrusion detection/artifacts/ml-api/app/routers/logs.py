from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.network_log import NetworkLog
from app.schemas.logs import LogOut, LogsResponse

router = APIRouter()


@router.get("/logs", response_model=LogsResponse)
async def get_logs(
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=50, ge=1, le=200),
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if status is not None and status not in ("benign", "malicious"):
        raise HTTPException(status_code=400, detail="status must be 'benign' or 'malicious'")

    query = select(NetworkLog)

    if status:
        query = query.where(NetworkLog.status == status)

    if search:
        query = query.where(
            or_(
                NetworkLog.source_ip.ilike(f"%{search}%"),
                NetworkLog.destination_ip.ilike(f"%{search}%"),
                NetworkLog.node_id.ilike(f"%{search}%"),
                NetworkLog.protocol.ilike(f"%{search}%"),
            )
        )

    # Total count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    # Paginated results
    offset = (page - 1) * pageSize
    query = query.order_by(NetworkLog.timestamp.desc()).offset(offset).limit(pageSize)
    rows = (await db.execute(query)).scalars().all()

    return LogsResponse(
        logs=[LogOut.from_orm_obj(r) for r in rows],
        total=total,
        page=page,
        pageSize=pageSize,
    )


@router.get("/logs/recent", response_model=list[LogOut])
async def get_recent_logs(
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = (
        select(NetworkLog)
        .order_by(NetworkLog.timestamp.desc())
        .limit(limit)
    )
    rows = (await db.execute(query)).scalars().all()
    return [LogOut.from_orm_obj(r) for r in rows]
