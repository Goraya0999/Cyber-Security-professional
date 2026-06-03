"""
CICIDS-2017 Style Synthetic Dataset Generator
============================================

Generates a realistic synthetic network traffic dataset following the
CICIDS-2017 feature schema (79 features per flow). Each attack type
has statistically distinct feature distributions to ensure the model
can actually learn meaningful patterns.

Usage:
    python ml/generate_dataset.py

Output:
    ml/cicids_dataset.csv   (~108,000 rows, 79 features + label)
"""

import numpy as np
import pandas as pd
from pathlib import Path

SEED = 42
rng = np.random.default_rng(SEED)

OUTPUT_PATH = Path(__file__).parent / "cicids_dataset.csv"


# ---------------------------------------------------------------------------
# Feature column names (matching CICIDS-2017 schema)
# ---------------------------------------------------------------------------

FEATURE_COLUMNS = [
    "Flow Duration", "Total Fwd Packets", "Total Backward Packets",
    "Total Length of Fwd Packets", "Total Length of Bwd Packets",
    "Fwd Packet Length Max", "Fwd Packet Length Min", "Fwd Packet Length Mean",
    "Fwd Packet Length Std", "Bwd Packet Length Max", "Bwd Packet Length Min",
    "Bwd Packet Length Mean", "Bwd Packet Length Std",
    "Flow Bytes/s", "Flow Packets/s",
    "Flow IAT Mean", "Flow IAT Std", "Flow IAT Max", "Flow IAT Min",
    "Fwd IAT Total", "Fwd IAT Mean", "Fwd IAT Std", "Fwd IAT Max", "Fwd IAT Min",
    "Bwd IAT Total", "Bwd IAT Mean", "Bwd IAT Std", "Bwd IAT Max", "Bwd IAT Min",
    "Fwd PSH Flags", "Bwd PSH Flags",
    "Fwd URG Flags", "Bwd URG Flags",
    "Fwd Header Length", "Bwd Header Length",
    "Fwd Packets/s", "Bwd Packets/s",
    "Min Packet Length", "Max Packet Length", "Packet Length Mean",
    "Packet Length Std", "Packet Length Variance",
    "FIN Flag Count", "SYN Flag Count", "RST Flag Count", "PSH Flag Count",
    "ACK Flag Count", "URG Flag Count", "CWE Flag Count", "ECE Flag Count",
    "Down/Up Ratio",
    "Average Packet Size",
    "Avg Fwd Segment Size", "Avg Bwd Segment Size",
    "Fwd Header Length.1",
    "Fwd Avg Bytes/Bulk", "Fwd Avg Packets/Bulk", "Fwd Avg Bulk Rate",
    "Bwd Avg Bytes/Bulk", "Bwd Avg Packets/Bulk", "Bwd Avg Bulk Rate",
    "Subflow Fwd Packets", "Subflow Fwd Bytes",
    "Subflow Bwd Packets", "Subflow Bwd Bytes",
    "Init_Win_bytes_forward", "Init_Win_bytes_backward",
    "act_data_pkt_fwd", "min_seg_size_forward",
    "Active Mean", "Active Std", "Active Max", "Active Min",
    "Idle Mean", "Idle Std", "Idle Max", "Idle Min",
    "Protocol",
]

LABELS = [
    "BENIGN",
    "DoS Hulk",
    "PortScan",
    "DDoS",
    "DoS GoldenEye",
    "FTP-Patator",
    "SSH-Patator",
]


# ---------------------------------------------------------------------------
# Per-class feature generators
# ---------------------------------------------------------------------------

def make_benign(n: int) -> pd.DataFrame:
    """Normal HTTP/HTTPS web browsing traffic."""
    data = {
        "Flow Duration":               rng.normal(500_000, 200_000, n).clip(1_000),
        "Total Fwd Packets":           rng.normal(8, 4, n).clip(1),
        "Total Backward Packets":      rng.normal(6, 3, n).clip(0),
        "Total Length of Fwd Packets": rng.normal(1200, 400, n).clip(0),
        "Total Length of Bwd Packets": rng.normal(5000, 2000, n).clip(0),
        "Fwd Packet Length Max":       rng.normal(800, 200, n).clip(0),
        "Fwd Packet Length Min":       rng.normal(20, 10, n).clip(0),
        "Fwd Packet Length Mean":      rng.normal(150, 50, n).clip(0),
        "Fwd Packet Length Std":       rng.normal(100, 40, n).clip(0),
        "Bwd Packet Length Max":       rng.normal(1400, 300, n).clip(0),
        "Bwd Packet Length Min":       rng.normal(20, 10, n).clip(0),
        "Bwd Packet Length Mean":      rng.normal(833, 200, n).clip(0),
        "Bwd Packet Length Std":       rng.normal(400, 100, n).clip(0),
        "Flow Bytes/s":                rng.normal(15_000, 8_000, n).clip(0),
        "Flow Packets/s":              rng.normal(28, 12, n).clip(0),
        "Flow IAT Mean":               rng.normal(35_000, 15_000, n).clip(0),
        "Flow IAT Std":                rng.normal(60_000, 20_000, n).clip(0),
        "Flow IAT Max":                rng.normal(200_000, 80_000, n).clip(0),
        "Flow IAT Min":                rng.normal(50, 30, n).clip(0),
        "SYN Flag Count":              rng.integers(0, 2, n).astype(float),
        "FIN Flag Count":              rng.integers(0, 2, n).astype(float),
        "RST Flag Count":              rng.integers(0, 1, n).astype(float),
        "PSH Flag Count":              rng.integers(1, 6, n).astype(float),
        "ACK Flag Count":              rng.normal(10, 4, n).clip(0),
        "Protocol":                    rng.choice([6, 17], n, p=[0.8, 0.2]).astype(float),
        "Down/Up Ratio":               rng.normal(3.5, 1.2, n).clip(0),
        "Average Packet Size":         rng.normal(450, 100, n).clip(20),
        "Active Mean":                 rng.normal(80_000, 30_000, n).clip(0),
        "Idle Mean":                   rng.normal(120_000, 50_000, n).clip(0),
        "Init_Win_bytes_forward":      rng.normal(65535, 10000, n).clip(0),
        "Init_Win_bytes_backward":     rng.normal(65535, 10000, n).clip(0),
    }
    return _fill_defaults(data, n)


def make_dos_hulk(n: int) -> pd.DataFrame:
    """DoS Hulk: HTTP flood with many small requests at high rate."""
    data = {
        "Flow Duration":               rng.normal(1_000, 500, n).clip(1),
        "Total Fwd Packets":           rng.normal(500, 80, n).clip(100),
        "Total Backward Packets":      rng.normal(2, 2, n).clip(0),
        "Total Length of Fwd Packets": rng.normal(25_000, 5_000, n).clip(0),
        "Total Length of Bwd Packets": rng.normal(100, 50, n).clip(0),
        "Fwd Packet Length Max":       rng.normal(52, 5, n).clip(0),
        "Fwd Packet Length Min":       rng.normal(52, 2, n).clip(0),
        "Fwd Packet Length Mean":      rng.normal(52, 2, n).clip(0),
        "Fwd Packet Length Std":       rng.normal(0.5, 0.2, n).clip(0),
        "Bwd Packet Length Max":       rng.normal(0, 0, n).clip(0),
        "Bwd Packet Length Min":       rng.normal(0, 0, n).clip(0),
        "Bwd Packet Length Mean":      rng.normal(0, 0, n).clip(0),
        "Bwd Packet Length Std":       rng.normal(0, 0, n).clip(0),
        "Flow Bytes/s":                rng.normal(12_000_000, 3_000_000, n).clip(0),
        "Flow Packets/s":              rng.normal(250_000, 50_000, n).clip(0),
        "Flow IAT Mean":               rng.normal(4, 2, n).clip(0),
        "Flow IAT Std":                rng.normal(2, 1, n).clip(0),
        "Flow IAT Max":                rng.normal(10, 5, n).clip(0),
        "Flow IAT Min":                rng.normal(0, 0, n).clip(0),
        "SYN Flag Count":              rng.normal(1, 0.2, n).clip(0),
        "FIN Flag Count":              rng.integers(0, 1, n).astype(float),
        "RST Flag Count":              rng.integers(0, 1, n).astype(float),
        "PSH Flag Count":              rng.normal(250, 50, n).clip(0),
        "ACK Flag Count":              rng.normal(500, 80, n).clip(0),
        "Protocol":                    np.full(n, 6.0),
        "Down/Up Ratio":               rng.normal(0.01, 0.005, n).clip(0),
        "Average Packet Size":         rng.normal(52, 2, n).clip(0),
        "Active Mean":                 rng.normal(100, 50, n).clip(0),
        "Idle Mean":                   rng.normal(50, 20, n).clip(0),
        "Init_Win_bytes_forward":      rng.normal(8192, 1000, n).clip(0),
        "Init_Win_bytes_backward":     rng.normal(0, 0, n).clip(0),
    }
    return _fill_defaults(data, n)


def make_port_scan(n: int) -> pd.DataFrame:
    """PortScan: rapid sequential connection attempts to different ports."""
    data = {
        "Flow Duration":               rng.normal(0, 0, n).clip(0),
        "Total Fwd Packets":           np.ones(n),
        "Total Backward Packets":      np.zeros(n),
        "Total Length of Fwd Packets": rng.normal(44, 2, n).clip(0),
        "Total Length of Bwd Packets": np.zeros(n),
        "Fwd Packet Length Max":       rng.normal(44, 2, n).clip(0),
        "Fwd Packet Length Min":       rng.normal(44, 2, n).clip(0),
        "Fwd Packet Length Mean":      rng.normal(44, 2, n).clip(0),
        "Fwd Packet Length Std":       np.zeros(n),
        "Bwd Packet Length Max":       np.zeros(n),
        "Bwd Packet Length Min":       np.zeros(n),
        "Bwd Packet Length Mean":      np.zeros(n),
        "Bwd Packet Length Std":       np.zeros(n),
        "Flow Bytes/s":                rng.normal(0, 0, n).clip(0),
        "Flow Packets/s":              rng.normal(2000, 500, n).clip(0),
        "Flow IAT Mean":               np.zeros(n),
        "Flow IAT Std":                np.zeros(n),
        "Flow IAT Max":                np.zeros(n),
        "Flow IAT Min":                np.zeros(n),
        "SYN Flag Count":              np.ones(n),
        "FIN Flag Count":              np.zeros(n),
        "RST Flag Count":              rng.integers(0, 2, n).astype(float),
        "PSH Flag Count":              np.zeros(n),
        "ACK Flag Count":              np.zeros(n),
        "Protocol":                    np.full(n, 6.0),
        "Down/Up Ratio":               np.zeros(n),
        "Average Packet Size":         rng.normal(44, 2, n).clip(0),
        "Active Mean":                 np.zeros(n),
        "Idle Mean":                   np.zeros(n),
        "Init_Win_bytes_forward":      rng.normal(1024, 100, n).clip(0),
        "Init_Win_bytes_backward":     np.zeros(n),
    }
    return _fill_defaults(data, n)


def make_ddos(n: int) -> pd.DataFrame:
    """DDoS: UDP flood from many sources, high packet rate."""
    data = {
        "Flow Duration":               rng.normal(120_000, 30_000, n).clip(1),
        "Total Fwd Packets":           rng.normal(1000, 200, n).clip(100),
        "Total Backward Packets":      rng.normal(5, 3, n).clip(0),
        "Total Length of Fwd Packets": rng.normal(128_000, 20_000, n).clip(0),
        "Total Length of Bwd Packets": rng.normal(200, 100, n).clip(0),
        "Fwd Packet Length Max":       rng.normal(128, 10, n).clip(0),
        "Fwd Packet Length Min":       rng.normal(128, 5, n).clip(0),
        "Fwd Packet Length Mean":      rng.normal(128, 5, n).clip(0),
        "Fwd Packet Length Std":       rng.normal(0.1, 0.05, n).clip(0),
        "Bwd Packet Length Max":       rng.normal(40, 10, n).clip(0),
        "Bwd Packet Length Min":       rng.normal(40, 10, n).clip(0),
        "Bwd Packet Length Mean":      rng.normal(40, 10, n).clip(0),
        "Bwd Packet Length Std":       rng.normal(0, 0, n).clip(0),
        "Flow Bytes/s":                rng.normal(8_000_000, 2_000_000, n).clip(0),
        "Flow Packets/s":              rng.normal(60_000, 15_000, n).clip(0),
        "Flow IAT Mean":               rng.normal(2, 1, n).clip(0),
        "Flow IAT Std":                rng.normal(1, 0.5, n).clip(0),
        "Flow IAT Max":                rng.normal(5, 2, n).clip(0),
        "Flow IAT Min":                np.zeros(n),
        "SYN Flag Count":              np.zeros(n),
        "FIN Flag Count":              np.zeros(n),
        "RST Flag Count":              np.zeros(n),
        "PSH Flag Count":              np.zeros(n),
        "ACK Flag Count":              np.zeros(n),
        "Protocol":                    np.full(n, 17.0),  # UDP
        "Down/Up Ratio":               rng.normal(0.005, 0.002, n).clip(0),
        "Average Packet Size":         rng.normal(128, 5, n).clip(0),
        "Active Mean":                 rng.normal(50, 20, n).clip(0),
        "Idle Mean":                   rng.normal(200, 80, n).clip(0),
        "Init_Win_bytes_forward":      np.zeros(n),
        "Init_Win_bytes_backward":     np.zeros(n),
    }
    return _fill_defaults(data, n)


def make_dos_goldeneye(n: int) -> pd.DataFrame:
    """DoS GoldenEye: HTTP connection exhaustion (keep-alive abuse)."""
    data = {
        "Flow Duration":               rng.normal(3_000_000, 1_000_000, n).clip(1),
        "Total Fwd Packets":           rng.normal(30, 10, n).clip(5),
        "Total Backward Packets":      rng.normal(20, 8, n).clip(0),
        "Total Length of Fwd Packets": rng.normal(5000, 1500, n).clip(0),
        "Total Length of Bwd Packets": rng.normal(15000, 4000, n).clip(0),
        "Fwd Packet Length Max":       rng.normal(500, 100, n).clip(0),
        "Fwd Packet Length Min":       rng.normal(20, 5, n).clip(0),
        "Fwd Packet Length Mean":      rng.normal(167, 50, n).clip(0),
        "Fwd Packet Length Std":       rng.normal(150, 40, n).clip(0),
        "Bwd Packet Length Max":       rng.normal(1400, 200, n).clip(0),
        "Bwd Packet Length Min":       rng.normal(20, 5, n).clip(0),
        "Bwd Packet Length Mean":      rng.normal(750, 150, n).clip(0),
        "Bwd Packet Length Std":       rng.normal(500, 100, n).clip(0),
        "Flow Bytes/s":                rng.normal(6_000, 2_000, n).clip(0),
        "Flow Packets/s":              rng.normal(16, 5, n).clip(0),
        "Flow IAT Mean":               rng.normal(200_000, 80_000, n).clip(0),
        "Flow IAT Std":                rng.normal(300_000, 100_000, n).clip(0),
        "Flow IAT Max":                rng.normal(1_000_000, 300_000, n).clip(0),
        "Flow IAT Min":                rng.normal(100, 50, n).clip(0),
        "SYN Flag Count":              np.ones(n),
        "FIN Flag Count":              np.zeros(n),
        "RST Flag Count":              rng.integers(0, 3, n).astype(float),
        "PSH Flag Count":              rng.normal(20, 5, n).clip(0),
        "ACK Flag Count":              rng.normal(50, 15, n).clip(0),
        "Protocol":                    np.full(n, 6.0),
        "Down/Up Ratio":               rng.normal(3.0, 0.8, n).clip(0),
        "Average Packet Size":         rng.normal(400, 80, n).clip(0),
        "Active Mean":                 rng.normal(500_000, 200_000, n).clip(0),
        "Idle Mean":                   rng.normal(800_000, 300_000, n).clip(0),
        "Init_Win_bytes_forward":      rng.normal(8192, 2000, n).clip(0),
        "Init_Win_bytes_backward":     rng.normal(8192, 2000, n).clip(0),
    }
    return _fill_defaults(data, n)


def make_ftp_patator(n: int) -> pd.DataFrame:
    """FTP-Patator: brute force FTP login attempts."""
    data = {
        "Flow Duration":               rng.normal(90_000, 30_000, n).clip(1_000),
        "Total Fwd Packets":           rng.normal(8, 2, n).clip(2),
        "Total Backward Packets":      rng.normal(8, 2, n).clip(2),
        "Total Length of Fwd Packets": rng.normal(500, 100, n).clip(0),
        "Total Length of Bwd Packets": rng.normal(600, 120, n).clip(0),
        "Fwd Packet Length Max":       rng.normal(100, 20, n).clip(0),
        "Fwd Packet Length Min":       rng.normal(20, 5, n).clip(0),
        "Fwd Packet Length Mean":      rng.normal(62, 15, n).clip(0),
        "Fwd Packet Length Std":       rng.normal(35, 10, n).clip(0),
        "Bwd Packet Length Max":       rng.normal(120, 25, n).clip(0),
        "Bwd Packet Length Min":       rng.normal(20, 5, n).clip(0),
        "Bwd Packet Length Mean":      rng.normal(75, 18, n).clip(0),
        "Bwd Packet Length Std":       rng.normal(40, 10, n).clip(0),
        "Flow Bytes/s":                rng.normal(12_000, 4_000, n).clip(0),
        "Flow Packets/s":              rng.normal(178, 40, n).clip(0),
        "Flow IAT Mean":               rng.normal(5_625, 1_500, n).clip(0),
        "Flow IAT Std":                rng.normal(8_000, 2_000, n).clip(0),
        "Flow IAT Max":                rng.normal(25_000, 8_000, n).clip(0),
        "Flow IAT Min":                rng.normal(10, 5, n).clip(0),
        "SYN Flag Count":              np.ones(n),
        "FIN Flag Count":              np.ones(n),
        "RST Flag Count":              np.zeros(n),
        "PSH Flag Count":              rng.normal(5, 2, n).clip(0),
        "ACK Flag Count":              rng.normal(15, 4, n).clip(0),
        "Protocol":                    np.full(n, 6.0),
        "Down/Up Ratio":               rng.normal(1.2, 0.3, n).clip(0),
        "Average Packet Size":         rng.normal(69, 15, n).clip(0),
        "Active Mean":                 rng.normal(10_000, 3_000, n).clip(0),
        "Idle Mean":                   rng.normal(30_000, 10_000, n).clip(0),
        "Init_Win_bytes_forward":      rng.normal(227, 50, n).clip(0),
        "Init_Win_bytes_backward":     rng.normal(65535, 5000, n).clip(0),
    }
    return _fill_defaults(data, n)


def make_ssh_patator(n: int) -> pd.DataFrame:
    """SSH-Patator: brute force SSH login attempts."""
    data = {
        "Flow Duration":               rng.normal(200_000, 60_000, n).clip(1_000),
        "Total Fwd Packets":           rng.normal(18, 4, n).clip(5),
        "Total Backward Packets":      rng.normal(14, 4, n).clip(3),
        "Total Length of Fwd Packets": rng.normal(1400, 300, n).clip(0),
        "Total Length of Bwd Packets": rng.normal(1200, 250, n).clip(0),
        "Fwd Packet Length Max":       rng.normal(200, 40, n).clip(0),
        "Fwd Packet Length Min":       rng.normal(20, 5, n).clip(0),
        "Fwd Packet Length Mean":      rng.normal(78, 20, n).clip(0),
        "Fwd Packet Length Std":       rng.normal(60, 15, n).clip(0),
        "Bwd Packet Length Max":       rng.normal(184, 40, n).clip(0),
        "Bwd Packet Length Min":       rng.normal(24, 6, n).clip(0),
        "Bwd Packet Length Mean":      rng.normal(86, 20, n).clip(0),
        "Bwd Packet Length Std":       rng.normal(60, 15, n).clip(0),
        "Flow Bytes/s":                rng.normal(13_000, 4_000, n).clip(0),
        "Flow Packets/s":              rng.normal(160, 40, n).clip(0),
        "Flow IAT Mean":               rng.normal(6_250, 1_800, n).clip(0),
        "Flow IAT Std":                rng.normal(25_000, 8_000, n).clip(0),
        "Flow IAT Max":                rng.normal(130_000, 40_000, n).clip(0),
        "Flow IAT Min":                rng.normal(8, 4, n).clip(0),
        "SYN Flag Count":              np.ones(n),
        "FIN Flag Count":              np.ones(n),
        "RST Flag Count":              np.zeros(n),
        "PSH Flag Count":              rng.normal(12, 3, n).clip(0),
        "ACK Flag Count":              rng.normal(30, 7, n).clip(0),
        "Protocol":                    np.full(n, 6.0),
        "Down/Up Ratio":               rng.normal(0.78, 0.2, n).clip(0),
        "Average Packet Size":         rng.normal(82, 18, n).clip(0),
        "Active Mean":                 rng.normal(25_000, 8_000, n).clip(0),
        "Idle Mean":                   rng.normal(60_000, 20_000, n).clip(0),
        "Init_Win_bytes_forward":      rng.normal(65535, 5000, n).clip(0),
        "Init_Win_bytes_backward":     rng.normal(65535, 5000, n).clip(0),
    }
    return _fill_defaults(data, n)


# ---------------------------------------------------------------------------
# Helper: fill remaining CICIDS columns with sensible defaults
# ---------------------------------------------------------------------------

def _fill_defaults(data: dict, n: int) -> pd.DataFrame:
    """Fill any missing columns with plausible default values."""
    df = pd.DataFrame(data)

    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            if "Fwd IAT" in col or "Bwd IAT" in col:
                df[col] = rng.exponential(10_000, n)
            elif "Header Length" in col:
                df[col] = rng.normal(40, 8, n).clip(20)
            elif "Bulk" in col:
                df[col] = np.zeros(n)
            elif "Subflow" in col:
                src = "Total Fwd Packets" if "Fwd" in col else "Total Backward Packets"
                df[col] = df.get(src, pd.Series(np.zeros(n))).values / 2
            elif "Active" in col or "Idle" in col:
                df[col] = rng.exponential(50_000, n)
            elif col == "act_data_pkt_fwd":
                df[col] = rng.integers(1, 10, n).astype(float)
            elif col == "min_seg_size_forward":
                df[col] = rng.normal(20, 5, n).clip(8)
            elif col in ("URG Flag Count", "CWE Flag Count", "ECE Flag Count"):
                df[col] = np.zeros(n)
            elif col in ("Fwd PSH Flags", "Bwd PSH Flags", "Fwd URG Flags", "Bwd URG Flags"):
                df[col] = np.zeros(n)
            elif "Packets/s" in col:
                df[col] = rng.exponential(100, n)
            elif "Variance" in col:
                std_col = col.replace("Variance", "Std")
                df[col] = df.get(std_col, pd.Series(np.ones(n))).values ** 2
            elif "Avg Fwd Segment" in col:
                df[col] = df.get("Fwd Packet Length Mean", pd.Series(np.zeros(n))).values
            elif "Avg Bwd Segment" in col:
                df[col] = df.get("Bwd Packet Length Mean", pd.Series(np.zeros(n))).values
            else:
                df[col] = rng.exponential(100, n)

    # Reorder to match FEATURE_COLUMNS
    df = df.reindex(columns=FEATURE_COLUMNS, fill_value=0.0)
    return df.clip(lower=0)


# ---------------------------------------------------------------------------
# Main generation loop
# ---------------------------------------------------------------------------

ATTACK_CONFIG = [
    ("BENIGN",          70_000, make_benign),
    ("DoS Hulk",        10_000, make_dos_hulk),
    ("PortScan",         8_000, make_port_scan),
    ("DDoS",             8_000, make_ddos),
    ("DoS GoldenEye",    5_000, make_dos_goldeneye),
    ("FTP-Patator",      4_000, make_ftp_patator),
    ("SSH-Patator",      3_000, make_ssh_patator),
]


def generate() -> pd.DataFrame:
    frames = []
    total = sum(n for _, n, _ in ATTACK_CONFIG)
    generated = 0

    print(f"Generating {total:,} network flow records...")
    for label, n, maker in ATTACK_CONFIG:
        df = maker(n)
        df["Label"] = label
        frames.append(df)
        generated += n
        print(f"  [{generated:>6,}/{total:,}]  {label:<20} ({n:,} samples)")

    dataset = pd.concat(frames, ignore_index=True)

    # Shuffle
    dataset = dataset.sample(frac=1, random_state=SEED).reset_index(drop=True)

    print(f"\nDataset shape: {dataset.shape}")
    print(f"Label distribution:\n{dataset['Label'].value_counts()}\n")
    return dataset


if __name__ == "__main__":
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df = generate()
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"[OK] Dataset saved to: {OUTPUT_PATH}")
    print(f"  Size: {OUTPUT_PATH.stat().st_size / 1024 / 1024:.1f} MB")
