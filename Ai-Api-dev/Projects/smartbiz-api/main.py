from fastapi import FastAPI,Depends,HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import engine,get_db,Base
from models import User
from auth import hash_password,verify_password,create_token,get_current_user
import models
from models import User,Business, ChatMessage
import json

models.Base.metadata.create_all(bind=engine)
app = FastAPI(title="smartBiz Assistant API")
class RegisterInput(BaseModel):
    email:str
    password:str

class BusinessSetup(BaseModel):
    name:str
    descriptions:str
    faqs:list[dict]

        
@app.get("/")
def root():
    return {"message":"SmartBiz Assistant API is running"}

@app.post("/auth/register")
def register(data:RegisterInput,db:Session = Depends(get_db)):
    if db.query(User).filter(User.email==data.email).first():
        raise HTTPException(400,"Email already registered")
    user=User(email=data.email,hashed_pw=hash_password(data.password))
    db.add(user)
    db.commit()
    return {"message":"Account created","email":data.email}

@app.post("/auth/login")
def login(form:OAuth2PasswordRequestForm=Depends(),db: Session=Depends(get_db)):
    user=db.query(User).filter(User.email==form.username).first()
    if not user or not verify_password(form.password,user.hashed_pw):
        raise HTTPException(401,"wrong credentials")
    token=create_token({"sub":user.email})
    return {"access_token":token , "token_type":"bearer"}

@app.post("/business", status_code=201)
def setup_business(
    data: BusinessSetup,
    db: Session = Depends(get_db),
    email: str = Depends(get_current_user)
):
    """configure an AI bot for a specific business."""

    user = db.query(User).filter(User.email == email).first()

    faq_text = "\n".join([
        f"Q: {faq['q']}\nA: {faq['a']}"
        for faq in data.faqs
    ])

    business = Business(
        user_id=user.id,
        name=data.name,
        description=data.descriptions,
        faqs=faq_text
    )

    db.add(business)
    db.commit()
    db.refresh(business)

    return {
        "id": business.id,
        "name": business.name,
        "message": f"Bot ready for {data.name}! use id={business.id} in /chat"
    }


@app.get("/business/{business_id}")
def get_business(
    business_id: int,
    db: Session = Depends(get_db),
    email: str = Depends(get_current_user)
):
    """Get Business Configuration."""

    business = db.query(Business).filter(
        Business.id == business_id
    ).first()

    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    return {
        "id": business.id,
        "name": business.name,
        "description": business.description,
        "faqs": business.faqs
    }