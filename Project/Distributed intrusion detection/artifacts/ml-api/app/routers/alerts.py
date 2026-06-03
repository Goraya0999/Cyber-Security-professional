from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.alert import Alert
from app.schemas.alerts import AlertOut

router = APIRouter()


@router.get("/alerts", response_model=list[AlertOut])
async def get_alerts(
    severity: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Alert).order_by(Alert.timestamp.desc())

    if severity and severity != "all":
        query = query.where(Alert.severity == severity)

    rows = (await db.execute(query)).scalars().all()
    return [AlertOut.from_orm_obj(r) for r in rows]


@router.patch("/alerts/{alert_id}/resolve", response_model=AlertOut)
async def resolve_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.resolved = True
    await db.commit()
    await db.refresh(alert)
    return AlertOut.from_orm_obj(alert)
