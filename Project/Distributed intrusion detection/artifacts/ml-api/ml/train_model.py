"""
Random Forest Model Trainer for DIDS
=====================================

Trains a Random Forest classifier on the synthetic CICIDS-2017 dataset,
evaluates it, saves the trained model + scaler + label encoder to disk.

Usage:
    python ml/train_model.py

Output:
    ml/model.pkl          - Trained RandomForestClassifier
    ml/scaler.pkl         - StandardScaler (fitted on training set)
    ml/label_encoder.pkl  - LabelEncoder for class names
    ml/feature_names.pkl  - Ordered list of feature names for inference
    ml/training_report.txt - Full classification report
"""

import time
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    f1_score,
)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

ML_DIR   = Path(__file__).parent
DATA_PATH = ML_DIR / "cicids_dataset.csv"
MODEL_PATH      = ML_DIR / "model.pkl"
SCALER_PATH     = ML_DIR / "scaler.pkl"
ENCODER_PATH    = ML_DIR / "label_encoder.pkl"
FEATURES_PATH   = ML_DIR / "feature_names.pkl"
REPORT_PATH     = ML_DIR / "training_report.txt"

SEED = 42


# ---------------------------------------------------------------------------
# Load & Prepare Data
# ---------------------------------------------------------------------------

def load_data() -> tuple[np.ndarray, np.ndarray, list[str]]:
    if not DATA_PATH.exists():
        print("Dataset not found. Generating it first...")
        from generate_dataset import generate
        df = generate()
        df.to_csv(DATA_PATH, index=False)
    else:
        print(f"Loading dataset from {DATA_PATH}...")
        df = pd.read_csv(DATA_PATH)

    print(f"  Loaded {len(df):,} records with {df.shape[1]} columns")

    # Drop rows with NaN / Inf
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df.dropna(inplace=True)

    feature_cols = [c for c in df.columns if c != "Label"]
    X = df[feature_cols].values.astype(np.float32)
    y = df["Label"].values

    return X, y, feature_cols


# ---------------------------------------------------------------------------
# Train
# ---------------------------------------------------------------------------

def train(X_train: np.ndarray, y_train_enc: np.ndarray) -> RandomForestClassifier:
    print("\nTraining Random Forest classifier...")
    print("  n_estimators=100, max_depth=25, min_samples_split=5")

    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=25,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features="sqrt",
        n_jobs=-1,             # Use all CPU cores
        random_state=SEED,
        class_weight="balanced",
    )

    start = time.time()
    clf.fit(X_train, y_train_enc)
    elapsed = time.time() - start
    print(f"  Training complete in {elapsed:.1f}s")
    return clf


# ---------------------------------------------------------------------------
# Evaluate
# ---------------------------------------------------------------------------

def evaluate(
    clf: RandomForestClassifier,
    scaler: StandardScaler,
    le: LabelEncoder,
    X_test: np.ndarray,
    y_test_enc: np.ndarray,
    feature_names: list[str],
) -> str:
    X_test_scaled = scaler.transform(X_test)
    y_pred = clf.predict(X_test_scaled)

    acc = accuracy_score(y_test_enc, y_pred)
    f1  = f1_score(y_test_enc, y_pred, average="weighted")

    class_names = le.classes_
    report = classification_report(y_test_enc, y_pred, target_names=class_names)

    # Feature importance top-20
    importances = clf.feature_importances_
    top_idx = np.argsort(importances)[::-1][:20]
    fi_lines = [f"  {i+1:>2}. {feature_names[idx]:<45} {importances[idx]:.4f}"
                for i, idx in enumerate(top_idx)]
    fi_section = "\n".join(fi_lines)

    # Confusion matrix summary
    cm = confusion_matrix(y_test_enc, y_pred)

    full_report = (
        f"=== DIDS Random Forest Training Report ===\n\n"
        f"Test set size : {len(y_test_enc):,} samples\n"
        f"Accuracy      : {acc:.4f}  ({acc*100:.2f}%)\n"
        f"F1 (weighted) : {f1:.4f}\n\n"
        f"--- Per-Class Report ---\n{report}\n"
        f"--- Top 20 Feature Importances ---\n{fi_section}\n\n"
        f"--- Confusion Matrix (rows=true, cols=pred) ---\n"
        f"Classes: {list(class_names)}\n{cm}\n"
    )

    print(f"\n{'='*55}")
    print(f"  Accuracy  : {acc:.4f}  ({acc*100:.2f}%)")
    print(f"  F1-score  : {f1:.4f}")
    print(f"{'='*55}")
    print(f"\nPer-class report:\n{report}")

    return full_report


# ---------------------------------------------------------------------------
# Save artifacts
# ---------------------------------------------------------------------------

def save_artifacts(
    clf: RandomForestClassifier,
    scaler: StandardScaler,
    le: LabelEncoder,
    feature_names: list[str],
    report: str,
) -> None:
    joblib.dump(clf,          MODEL_PATH)
    joblib.dump(scaler,       SCALER_PATH)
    joblib.dump(le,           ENCODER_PATH)
    joblib.dump(feature_names, FEATURES_PATH)
    REPORT_PATH.write_text(report)

    print("\nSaved artifacts:")
    for p in [MODEL_PATH, SCALER_PATH, ENCODER_PATH, FEATURES_PATH, REPORT_PATH]:
        size_kb = p.stat().st_size / 1024
        print(f"  {p.name:<25} {size_kb:>8.1f} KB")


# ---------------------------------------------------------------------------
# Inference helper — used by the FastAPI detection service
# ---------------------------------------------------------------------------

def load_model_artifacts() -> tuple:
    """Load saved model artifacts. Called at API startup."""
    clf     = joblib.load(MODEL_PATH)
    scaler  = joblib.load(SCALER_PATH)
    le      = joblib.load(ENCODER_PATH)
    features = joblib.load(FEATURES_PATH)
    return clf, scaler, le, features


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 55)
    print("  DIDS — Random Forest Model Training")
    print("=" * 55)

    # 1. Load data
    X, y_raw, feature_names = load_data()

    # 2. Encode labels
    le = LabelEncoder()
    y = le.fit_transform(y_raw)
    print(f"\nClasses: {list(le.classes_)}")

    # 3. Train/test split (stratified 80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=SEED, stratify=y
    )
    print(f"\nSplit: {len(X_train):,} train / {len(X_test):,} test")

    # 4. Scale features (fit on train only — no data leakage)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)

    # 5. Train
    clf = train(X_train_scaled, y_train)

    # 6. Evaluate
    report = evaluate(clf, scaler, le, X_test, y_test, feature_names)

    # 7. Save
    save_artifacts(clf, scaler, le, feature_names, report)

    print("\n[OK] Model training complete!")
    print(f"  Model ready at: {MODEL_PATH}")
