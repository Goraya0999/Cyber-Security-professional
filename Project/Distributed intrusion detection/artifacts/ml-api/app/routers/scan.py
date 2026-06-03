from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_user_or_internal_service
from app.models.user import User
from app.models.network_log import NetworkLog
from app.models.alert import Alert
from app.schemas.scan import ScanRequest, ScanResponse
from app.services.detection_service import DetectionService

router = APIRouter()


@router.post("/scan", response_model=ScanResponse)
async def scan(
    body: ScanRequest,
    db: AsyncSession = Depends(get_db),
    _: User | None = Depends(get_current_user_or_internal_service),
):
    """
    Run ML-based intrusion detection on incoming network traffic.
    Automatically creates an alert if malicious traffic is detected.
    """
    result = DetectionService.predict(
        source_ip=body.sourceIp,
        destination_ip=body.destinationIp,
        protocol=body.protocol,
        data=body.data,
        bytes_sent=body.bytesSent,
    )

    # Persist log
    log = NetworkLog(
        source_ip=body.sourceIp,
        destination_ip=body.destinationIp,
        protocol=body.protocol,
        data=body.data,
        node_id=body.nodeId,
        bytes_sent=body.bytesSent,
        status=result.prediction,
        confidence_score=result.confidence_score,
        threat_type=result.threat_type,
    )
    db.add(log)
    await db.flush()  # Get the log ID before creating alert

    # Auto-create alert if malicious
    alert_id: int | None = None
    if result.prediction == "malicious" and result.alert_title:
        alert = Alert(
            log_id=log.id,
            title=result.alert_title,
            description=result.alert_description or "",
            severity=result.severity,
            source_ip=body.sourceIp,
            node_id=body.nodeId,
            threat_type=result.threat_type,
        )
        db.add(alert)
        await db.flush()
        alert_id = alert.id

    await db.commit()

    message = (
        f"Threat detected: {result.threat_type}" if result.prediction == "malicious"
        else "Traffic classified as benign"
    )

    return ScanResponse(
        logId=log.id,
        prediction=result.prediction,
        confidenceScore=result.confidence_score,
        threatType=result.threat_type,
        alertId=alert_id,
        message=message,
    )
