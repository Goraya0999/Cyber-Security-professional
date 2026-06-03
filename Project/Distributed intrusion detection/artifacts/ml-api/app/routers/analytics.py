from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.network_log import NetworkLog
from app.models.alert import Alert

router = APIRouter()


class TimeSeriesPoint(BaseModel):
    timestamp: str
    benign: int
    malicious: int


class ThreatDistItem(BaseModel):
    threatType: str
    count: int


class AnalyticsResponse(BaseModel):
    timeSeries: list[TimeSeriesPoint]
    threatDistribution: list[ThreatDistItem]
    topSourceIps: list[dict]


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    # Last 24 hours, hourly buckets
    now = datetime.now(timezone.utc)
    since = now - timedelta(hours=24)

    rows = (
        await db.execute(
            select(NetworkLog)
            .where(NetworkLog.timestamp >= since)
            .order_by(NetworkLog.timestamp.asc())
        )
    ).scalars().all()

    # Build hourly buckets
    buckets: dict[str, dict] = {}
    for i in range(24):
        hour_ts = (since + timedelta(hours=i)).strftime("%Y-%m-%dT%H:00:00Z")
        buckets[hour_ts] = {"timestamp": hour_ts, "benign": 0, "malicious": 0}

    for row in rows:
        ts = row.timestamp
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        hour_key = ts.strftime("%Y-%m-%dT%H:00:00Z")
        if hour_key in buckets:
            buckets[hour_key][row.status] += 1

    # Threat distribution
    threat_rows = (
        await db.execute(
            select(NetworkLog.threat_type, func.count().label("cnt"))
            .where(NetworkLog.status == "malicious", NetworkLog.threat_type.isnot(None))
            .group_by(NetworkLog.threat_type)
            .order_by(func.count().desc())
        )
    ).all()

    threat_dist = [
        ThreatDistItem(threatType=r.threat_type, count=r.cnt) for r in threat_rows
    ]

    # Top source IPs
    ip_rows = (
        await db.execute(
            select(NetworkLog.source_ip, func.count().label("cnt"))
            .group_by(NetworkLog.source_ip)
            .order_by(func.count().desc())
            .limit(10)
        )
    ).all()

    top_ips = [{"sourceIp": r.source_ip, "count": r.cnt} for r in ip_rows]

    return AnalyticsResponse(
        timeSeries=list(buckets.values()),
        threatDistribution=threat_dist,
        topSourceIps=top_ips,
    )
