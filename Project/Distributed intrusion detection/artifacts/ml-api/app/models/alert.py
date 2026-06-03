from datetime import datetime, timezone
from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    log_id: Mapped[int] = mapped_column(Integer, ForeignKey("network_logs.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # critical|high|medium|low
    source_ip: Mapped[str] = mapped_column(String(45), nullable=False)
    node_id: Mapped[str] = mapped_column(String(100), nullable=False)
    threat_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
