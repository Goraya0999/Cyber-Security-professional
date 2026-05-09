from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String, unique=True, index=True, nullable=False)

    hashed_pw = Column(String, nullable=False)

    name = Column(String, nullable=True)

    description = Column(Text)

    faqs = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)
    
    
class Business(Base):
    __tablename__ = "businesses"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"))

    name = Column(String, nullable=False)

    description = Column(Text)

    faqs = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)

    session_id = Column(String, index=True)

    role = Column(String)

    content = Column(Text)

    business_id = Column(Integer, ForeignKey("businesses.id"))

    created_at = Column(DateTime, default=datetime.utcnow)