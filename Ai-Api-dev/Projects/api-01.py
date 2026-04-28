from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional

app = FastAPI()


# -------------------- ROOT --------------------
@app.get("/")
def show():
    return {"message": "Hi from API"}


# -------------------- MODEL --------------------
class User(BaseModel):
    name: str
    age: int
    roll: Optional[int] = None
    marks: float = Field(default=10, ge=9, le=100)


# -------------------- CREATE USER --------------------
@app.post("/users")
def create_user(user: User):
    return {
        "Created": user.name,
        "Age": user.age,
        "Marks": user.marks
    }


# -------------------- UPDATE USER (WITH BODY) --------------------
@app.put("/users/{id}")
def update_user(id: int, notify: bool = False, user: User):
    return {
        "updated_id": id,
        "notify": notify,
        "new_name": user.name
    }


# -------------------- GET USER (FAKE DB) --------------------
@app.get("/users/{id}")
def get_user(id: int):
    fake_db = {1: "Ali", 2: "Sara"}

    if id not in fake_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"user {id} not found"
        )

    return {"name": fake_db[id]}
