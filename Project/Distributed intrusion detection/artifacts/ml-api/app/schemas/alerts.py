from datetime import datetime
from pydantic import BaseModel


class AlertOut(BaseModel):
    id: int
    logId: int
    title: str
    description: str
    severity: str
    sourceIp: str
    nodeId: str
    threatType: str | None
    resolved: bool
    timestamp: datetime

    @classmethod
    def from_orm_obj(cls, obj) -> "AlertOut":
        return cls(
            id=obj.id,
            logId=obj.log_id,
            title=obj.title,
            description=obj.description,
            severity=obj.severity,
            sourceIp=obj.source_ip,
            nodeId=obj.node_id,
            threatType=obj.threat_type,
            resolved=obj.resolved,
            timestamp=obj.timestamp,
        )


class ResolveRequest(BaseModel):
    pass  # body is empty — alert id comes from path param
