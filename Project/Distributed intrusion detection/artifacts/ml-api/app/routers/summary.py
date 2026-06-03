from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.network_log import NetworkLog
from app.models.alert import Alert

router = APIRouter()


class SummaryResponse(BaseModel):
    totalScans: int
    maliciousCount: int
    benignCount: int
    unresolvedAlerts: int
    detectionRate: float


@router.get("/summary", response_model=SummaryResponse)
async def get_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    total = (await db.execute(select(func.count()).select_from(NetworkLog))).scalar_one()

    malicious = (
        await db.execute(
            select(func.count()).select_from(NetworkLog).where(NetworkLog.status == "malicious")
        )
    ).scalar_one()

    unresolved = (
        await db.execute(
            select(func.count()).select_from(Alert).where(Alert.resolved == False)
        )
    ).scalar_one()

    benign = total - malicious
    rate = round(malicious / total, 4) if total > 0 else 0.0

    return SummaryResponse(
        totalScans=total,
        maliciousCount=malicious,
        benignCount=benign,
        unresolvedAlerts=unresolved,
        detectionRate=rate,
    )
