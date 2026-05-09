from jose import JWTError,jwt
from passlib.context import CryptContext
from fastapi import Depends,HTTPException,status
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime,timedelta
import os
from dotenv import load_dotenv
load_dotenv()
SECRET_KEY=os.getenv("SECRET_KEY")
Algorithm="HS256"
EXPIRE_MIN=60

pwd_context=CryptContext(schemes=["bcrypt"],deprecated="auto")
oauth2_scheme=OAuth2PasswordBearer(tokenUrl="auth/login")

def  hash_password(pw:str) -> str:
    return pwd_context.hash(pw)

def verify_password(plain:str,hashed:str) -> bool:
    return pwd_context.verify(plain,hashed)

def create_token(data: dict) -> str:
    payload=data.copy()
    payload["exp"]=datetime.utcnow() + timedelta(minutes=EXPIRE_MIN)
    return jwt.encode(payload,SECRET_KEY,algorithm=Algorithm)

def get_current_user(token:str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token,SECRET_KEY,algorithms=[Algorithm])
        email:str=payload.get("sub")
        if not email:
            raise HTTPException(status_code=401,detail="Invalid token")
        return email
    except JWTError:
        raise HTTPException(status_code=401,detail="invalid token")