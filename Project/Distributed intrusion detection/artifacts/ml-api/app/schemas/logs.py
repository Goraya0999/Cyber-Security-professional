from datetime import datetime
from pydantic import BaseModel


class LogOut(BaseModel):
    id: int
    sourceIp: str
    destinationIp: str
    protocol: str
    data: str | None
    nodeId: str
    bytesSent: int
    status: str
    confidenceScore: float
    threatType: str | None
    timestamp: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_obj(cls, obj) -> "LogOut":
        return cls(
            id=obj.id,
            sourceIp=obj.source_ip,
            destinationIp=obj.destination_ip,
            protocol=obj.protocol,
            data=obj.data,
            nodeId=obj.node_id,
            bytesSent=obj.bytes_sent,
            status=obj.status,
            confidenceScore=obj.confidence_score,
            threatType=obj.threat_type,
            timestamp=obj.timestamp,
        )


class LogsResponse(BaseModel):
    logs: list[LogOut]
    total: int
    page: int
    pageSize: int
