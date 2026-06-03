from datetime import datetime, timezone
from sqlalchemy import Integer, String, Float, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class NetworkLog(Base):
    __tablename__ = "network_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source_ip: Mapped[str] = mapped_column(String(45), nullable=False, index=True)
    destination_ip: Mapped[str] = mapped_column(String(45), nullable=False)
    protocol: Mapped[str] = mapped_column(String(20), nullable=False)
    data: Mapped[str | None] = mapped_column(Text, nullable=True)
    node_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    bytes_sent: Mapped[int] = mapped_column(Integer, default=0)

    # ML prediction output
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # benign | malicious
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    threat_type: Mapped[str | None] = mapped_column(String(100), nullable=True)

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
