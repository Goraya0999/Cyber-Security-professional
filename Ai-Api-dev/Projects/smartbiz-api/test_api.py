from fastapi.testclient import TestClient
from main import app
from database import Base, engine

# create tables
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_register():
    response = client.post("/auth/register", json={"email": "test@test.com", "password": "password"})
    print("Register:", response.status_code, response.json())
    return response.status_code == 200

def test_login():
    response = client.post("/auth/login", data={"username": "test@test.com", "password": "password"})
    print("Login:", response.status_code, response.json())
    return response.json().get("access_token")

if __name__ == "__main__":
    test_register()
    token = test_login()
    if token:
        # test setup business
        headers = {"Authorization": f"Bearer {token}"}
        res = client.post("/business", json={"name": "test biz", "descriptions": "test desc", "faqs": [{"q": "q1", "a": "a1"}]}, headers=headers)
        print("Business:", res.status_code, res.json())
