from pydantic import BaseModel


class ScanRequest(BaseModel):
    sourceIp: str
    destinationIp: str
    protocol: str
    data: str = ""
    nodeId: str
    bytesSent: int = 0


class ScanResponse(BaseModel):
    logId: int
    prediction: str
    confidenceScore: float
    threatType: str | None
    alertId: int | None
    message: str
