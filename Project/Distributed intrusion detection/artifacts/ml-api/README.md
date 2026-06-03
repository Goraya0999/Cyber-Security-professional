# DIDS ML API — Python FastAPI Backend

AI-powered Distributed Intrusion Detection System with a **trained Random Forest** classifier.

## Architecture

```
ml-api/
├── app/               FastAPI application
│   ├── main.py        App entry, CORS, startup
│   ├── database.py    Async SQLAlchemy engine
│   ├── core/          Config, JWT, dependencies
│   ├── models/        SQLAlchemy ORM (User, NetworkLog, Alert)
│   ├── schemas/       Pydantic request/response models
│   ├── routers/       Route handlers (auth, scan, logs, alerts…)
│   └── services/
│       └── detection_service.py   ← ML inference engine
├── ml/
│   ├── generate_dataset.py   Synthetic CICIDS-2017 dataset
│   ├── train_model.py        Random Forest training + evaluation
│   ├── model.pkl             Trained model (after training)
│   ├── scaler.pkl            Feature scaler
│   └── label_encoder.pkl     Class label encoder
└── requirements.txt
```

## Quick Start

### 1. Install dependencies

```bash
# Core API
pip install -r requirements.txt

# ML training tools
pip install -r requirements-ml.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET
```

### 3. Generate dataset & Train model

```bash
cd ml
python generate_dataset.py   # Creates cicids_dataset.csv (~108k rows)
python train_model.py        # Trains Random Forest, saves model.pkl
```

Expected output:
```
===================================================
  DIDS — Random Forest Model Training
===================================================
Generating 108,000 network flow records...
  [ 70,000/108,000]  BENIGN               (70,000 samples)
  [ 80,000/108,000]  DoS Hulk             (10,000 samples)
  ...
Training Random Forest classifier...
  Training complete in ~45s
=======================================================
  Accuracy  : 0.9987  (99.87%)
  F1-score  : 0.9986
=======================================================
Saved artifacts:
  model.pkl          ~42 MB
  scaler.pkl         ~2 KB
  label_encoder.pkl  ~1 KB
```

### 4. Start the API

```bash
uvicorn app.main:app --reload --port 8000
```

### 5. Interactive docs

Open **http://localhost:8000/api/docs** for Swagger UI.

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/healthz` | ❌ | Health check |
| POST | `/api/auth/signup` | ❌ | Register user |
| POST | `/api/auth/login` | ❌ | Login, get JWT |
| GET | `/api/auth/me` | ✅ | Current user |
| POST | `/api/scan` | ✅ | **ML intrusion scan** |
| GET | `/api/logs` | ✅ | Paginated logs |
| GET | `/api/logs/recent` | ✅ | Recent logs |
| GET | `/api/alerts` | ✅ | Alerts list |
| PATCH | `/api/alerts/{id}/resolve` | ✅ | Resolve alert |
| GET | `/api/analytics` | ✅ | Time series + threat dist |
| GET | `/api/summary` | ✅ | Dashboard stats |

---

## ML Model Details

- **Algorithm**: Random Forest (100 trees, max_depth=25)
- **Dataset**: Synthetic CICIDS-2017 (108,000 flows, 79 features)
- **Classes**: BENIGN, DoS Hulk, PortScan, DDoS, DoS GoldenEye, FTP-Patator, SSH-Patator
- **Expected Accuracy**: >99% on test set
- **Feature extraction**: Maps simplified `/scan` payload to 79 CICIDS flow features
- **Fallback**: Rule-based detection if model not trained

## Sample Scan Request

```bash
curl -X POST http://localhost:8000/api/scan \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceIp": "45.33.32.156",
    "destinationIp": "10.0.0.5",
    "protocol": "TCP",
    "data": "SYN flood attack 5000 pkts/s",
    "nodeId": "node-01",
    "bytesSent": 99000
  }'
```

Expected response:
```json
{
  "logId": 1,
  "prediction": "malicious",
  "confidenceScore": 0.99,
  "threatType": "DoS Hulk",
  "alertId": 1,
  "message": "Threat detected: DoS Hulk"
}
```
