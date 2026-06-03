"""
DIDS Detection Service
======================

Loads the trained Random Forest model and runs inference on incoming
network traffic scan requests.

Feature extraction maps the simplified /scan payload fields (sourceIp,
destinationIp, protocol, data, nodeId, bytesSent) to the 79 CICIDS-2017
flow features the model was trained on.
"""

import re
import math
import hashlib
import logging
import numpy as np
import joblib
from pathlib import Path
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

ML_DIR = Path(__file__).parent.parent.parent / "ml"

MODEL_PATH    = ML_DIR / "model.pkl"
SCALER_PATH   = ML_DIR / "scaler.pkl"
ENCODER_PATH  = ML_DIR / "label_encoder.pkl"
FEATURES_PATH = ML_DIR / "feature_names.pkl"


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class DetectionResult:
    prediction: str        # "benign" | "malicious"
    threat_type: str | None
    confidence_score: float
    severity: str          # "low" | "medium" | "high" | "critical"
    alert_title: str | None
    alert_description: str | None


# ---------------------------------------------------------------------------
# Known malicious / suspicious IP ranges (lightweight IP reputation)
# ---------------------------------------------------------------------------

SUSPICIOUS_IP_PREFIXES = [
    "45.33.", "192.241.", "104.131.", "198.199.",   # Common scan sources
    "10.0.0.0", "172.16.",                           # Internal RFC1918 if external
]

SQL_INJECTION_PATTERNS = re.compile(
    r"(UNION\s+SELECT|SELECT\s+\*|DROP\s+TABLE|INSERT\s+INTO|"
    r";\s*--|\bOR\s+1=1\b|\bAND\s+1=1\b|xp_cmdshell|"
    r"EXEC\s*\(|CAST\s*\(|CONVERT\s*\()",
    re.IGNORECASE,
)

XSS_PATTERNS = re.compile(
    r"(<script|javascript:|on\w+=|<iframe|<img[^>]+src\s*=\s*[\"']?javascript)",
    re.IGNORECASE,
)

COMMAND_INJECTION_PATTERNS = re.compile(
    r"(\|\s*\w+|;\s*\w+|`[^`]+`|\$\([^)]+\)|&&\s*\w+)",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Severity mapping per threat class
# ---------------------------------------------------------------------------

SEVERITY_MAP: dict[str, str] = {
    "DoS Hulk":       "critical",
    "DDoS":           "critical",
    "DoS GoldenEye":  "high",
    "PortScan":       "medium",
    "FTP-Patator":    "high",
    "SSH-Patator":    "high",
    "BENIGN":         "low",
}

ALERT_TITLES: dict[str, str] = {
    "DoS Hulk":       "DoS Hulk Attack Detected",
    "DDoS":           "DDoS Flood Attack Detected",
    "DoS GoldenEye":  "DoS GoldenEye Attack Detected",
    "PortScan":       "Port Scan Detected",
    "FTP-Patator":    "FTP Brute Force Attack",
    "SSH-Patator":    "SSH Brute Force Attack",
}

ALERT_DESCRIPTIONS: dict[str, str] = {
    "DoS Hulk":       "High-volume HTTP flood attack attempting to overwhelm the target server.",
    "DDoS":           "Distributed Denial of Service flood detected from multiple sources.",
    "DoS GoldenEye":  "HTTP connection exhaustion attack using keep-alive abuse.",
    "PortScan":       "Systematic port scan detected. Attacker is enumerating open services.",
    "FTP-Patator":    "Brute force credential attack against FTP service detected.",
    "SSH-Patator":    "Brute force credential attack against SSH service detected.",
}


# ---------------------------------------------------------------------------
# DetectionService
# ---------------------------------------------------------------------------

class DetectionService:
    """Singleton-style service: model loaded once at startup."""

    _clf = None
    _scaler = None
    _le = None
    _feature_names: list[str] = []
    _loaded: bool = False

    @classmethod
    def load_model(cls) -> None:
        """Load model artifacts from disk. Called at API startup."""
        if cls._loaded:
            return

        if not MODEL_PATH.exists():
            logger.warning(
                "Model artifacts not found at %s. "
                "Run 'python ml/train_model.py' to train the model. "
                "Falling back to rule-based detection.",
                ML_DIR,
            )
            cls._loaded = True
            return

        logger.info("Loading ML model from %s ...", ML_DIR)
        cls._clf           = joblib.load(MODEL_PATH)
        cls._scaler        = joblib.load(SCALER_PATH)
        cls._le            = joblib.load(ENCODER_PATH)
        cls._feature_names = joblib.load(FEATURES_PATH)
        cls._loaded = True
        logger.info(
            "Model loaded. Classes: %s",
            list(cls._le.classes_),
        )

    @classmethod
    def _extract_features(
        cls,
        source_ip: str,
        destination_ip: str,
        protocol: str,
        data: str,
        bytes_sent: int,
    ) -> np.ndarray:
        """
        Map the simplified /scan input fields to the 79 CICIDS-2017
        flow features the model expects.
        """
        # --- Protocol encoding ---
        proto_num = {"TCP": 6, "UDP": 17, "ICMP": 1}.get(protocol.upper(), 6)

        # --- Payload analysis ---
        data_len = len(data) if data else 0

        # Pattern-based flags
        has_sql  = 1.0 if data and SQL_INJECTION_PATTERNS.search(data) else 0.0
        has_xss  = 1.0 if data and XSS_PATTERNS.search(data) else 0.0
        has_cmdi = 1.0 if data and COMMAND_INJECTION_PATTERNS.search(data) else 0.0

        # SYN flood / port scan indicators from data keywords
        is_syn_flood  = 1.0 if data and ("SYN flood" in data or "SYN Flood" in data) else 0.0
        is_port_scan  = 1.0 if data and ("port scan" in data.lower() or "nmap" in data.lower()) else 0.0
        is_brute_force= 1.0 if data and any(k in data.lower() for k in ["brute", "patator", "hydra", "medusa"]) else 0.0
        is_ddos       = 1.0 if data and ("ddos" in data.lower() or "flood" in data.lower()) else 0.0

        # --- IP reputation score (0.0 = clean, 1.0 = suspicious) ---
        ip_risk = 0.0
        for prefix in SUSPICIOUS_IP_PREFIXES:
            if source_ip.startswith(prefix):
                ip_risk = 0.8
                break

        # Use a deterministic hash to generate a consistent "flow signature"
        flow_seed = int(hashlib.md5(f"{source_ip}{destination_ip}{protocol}".encode()).hexdigest(), 16) % 10000

        # --- Derive CICIDS-2017 features ---
        # bytes_sent affects packet sizes and rates
        fwd_pkts   = max(1.0, bytes_sent / 1500)
        bwd_pkts   = max(0.0, fwd_pkts * 0.6)
        fwd_bytes  = float(bytes_sent)
        bwd_bytes  = fwd_bytes * 0.8

        # Flow duration depends on protocol behaviour
        duration_base = {"TCP": 500_000, "UDP": 50_000, "ICMP": 1_000}.get(protocol.upper(), 500_000)
        flow_duration = float(duration_base)

        # High rate signals for DoS/DDoS
        if is_syn_flood or is_ddos:
            flow_duration = 1_000.0
            fwd_pkts      = 500.0
            bwd_pkts      = 2.0

        if is_port_scan:
            flow_duration = 0.0
            fwd_pkts      = 1.0
            bwd_pkts      = 0.0

        pkt_len_mean = (fwd_bytes / fwd_pkts) if fwd_pkts > 0 else 0.0
        flow_bytes_s = (fwd_bytes + bwd_bytes) / max(flow_duration / 1e6, 1e-9)
        flow_pkts_s  = (fwd_pkts + bwd_pkts)  / max(flow_duration / 1e6, 1e-9)

        # TCP flag features
        syn_flag = max(is_syn_flood, is_port_scan, is_brute_force)
        psh_flag = 0.0 if (is_syn_flood or is_port_scan) else 3.0
        ack_flag = 0.0 if is_port_scan else max(10.0, fwd_pkts * 0.8)

        # Init window sizes — small for attacks, large for benign
        init_win_fwd = 1024.0 if (is_syn_flood or is_port_scan) else 65535.0
        init_win_bwd = 0.0    if (is_syn_flood or is_port_scan) else 65535.0

        # Active/Idle times
        active_mean = 0.0 if is_port_scan else flow_duration * 0.3
        idle_mean   = flow_duration * 0.5

        # Build a vector aligned to CICIDS-2017 feature order
        feature_map: dict[str, float] = {
            "Flow Duration":               flow_duration,
            "Total Fwd Packets":           fwd_pkts,
            "Total Backward Packets":      bwd_pkts,
            "Total Length of Fwd Packets": fwd_bytes,
            "Total Length of Bwd Packets": bwd_bytes,
            "Fwd Packet Length Max":       min(pkt_len_mean * 1.5, 1500.0),
            "Fwd Packet Length Min":       min(pkt_len_mean * 0.3, 100.0),
            "Fwd Packet Length Mean":      pkt_len_mean,
            "Fwd Packet Length Std":       pkt_len_mean * 0.3,
            "Bwd Packet Length Max":       min(pkt_len_mean * 1.8, 1500.0),
            "Bwd Packet Length Min":       min(pkt_len_mean * 0.2, 60.0),
            "Bwd Packet Length Mean":      pkt_len_mean * 0.9,
            "Bwd Packet Length Std":       pkt_len_mean * 0.25,
            "Flow Bytes/s":                flow_bytes_s,
            "Flow Packets/s":              flow_pkts_s,
            "Flow IAT Mean":               flow_duration / max(fwd_pkts + bwd_pkts, 1),
            "Flow IAT Std":                flow_duration * 0.2,
            "Flow IAT Max":                flow_duration * 0.5,
            "Flow IAT Min":                0.0,
            "Fwd IAT Total":               flow_duration,
            "Fwd IAT Mean":                flow_duration / max(fwd_pkts, 1),
            "Fwd IAT Std":                 flow_duration * 0.15,
            "Fwd IAT Max":                 flow_duration * 0.4,
            "Fwd IAT Min":                 0.0,
            "Bwd IAT Total":               flow_duration * 0.9,
            "Bwd IAT Mean":                flow_duration / max(bwd_pkts, 1),
            "Bwd IAT Std":                 flow_duration * 0.15,
            "Bwd IAT Max":                 flow_duration * 0.4,
            "Bwd IAT Min":                 0.0,
            "Fwd PSH Flags":               0.0,
            "Bwd PSH Flags":               0.0,
            "Fwd URG Flags":               0.0,
            "Bwd URG Flags":               0.0,
            "Fwd Header Length":           fwd_pkts * 20.0,
            "Bwd Header Length":           bwd_pkts * 20.0,
            "Fwd Packets/s":               fwd_pkts / max(flow_duration / 1e6, 1e-9),
            "Bwd Packets/s":               bwd_pkts / max(flow_duration / 1e6, 1e-9),
            "Min Packet Length":           min(pkt_len_mean * 0.2, 40.0),
            "Max Packet Length":           min(pkt_len_mean * 1.8, 1500.0),
            "Packet Length Mean":          pkt_len_mean,
            "Packet Length Std":           pkt_len_mean * 0.3,
            "Packet Length Variance":      (pkt_len_mean * 0.3) ** 2,
            "FIN Flag Count":              1.0 if is_brute_force else 0.0,
            "SYN Flag Count":              syn_flag,
            "RST Flag Count":              0.0,
            "PSH Flag Count":              psh_flag,
            "ACK Flag Count":              ack_flag,
            "URG Flag Count":              0.0,
            "CWE Flag Count":              0.0,
            "ECE Flag Count":              0.0,
            "Down/Up Ratio":               bwd_pkts / max(fwd_pkts, 1),
            "Average Packet Size":         pkt_len_mean,
            "Avg Fwd Segment Size":        pkt_len_mean,
            "Avg Bwd Segment Size":        pkt_len_mean * 0.9,
            "Fwd Header Length.1":         fwd_pkts * 20.0,
            "Fwd Avg Bytes/Bulk":          0.0,
            "Fwd Avg Packets/Bulk":        0.0,
            "Fwd Avg Bulk Rate":           0.0,
            "Bwd Avg Bytes/Bulk":          0.0,
            "Bwd Avg Packets/Bulk":        0.0,
            "Bwd Avg Bulk Rate":           0.0,
            "Subflow Fwd Packets":         fwd_pkts / 2,
            "Subflow Fwd Bytes":           fwd_bytes / 2,
            "Subflow Bwd Packets":         bwd_pkts / 2,
            "Subflow Bwd Bytes":           bwd_bytes / 2,
            "Init_Win_bytes_forward":      init_win_fwd,
            "Init_Win_bytes_backward":     init_win_bwd,
            "act_data_pkt_fwd":            max(1.0, fwd_pkts * 0.7),
            "min_seg_size_forward":        20.0,
            "Active Mean":                 active_mean,
            "Active Std":                  active_mean * 0.2,
            "Active Max":                  active_mean * 1.5,
            "Active Min":                  active_mean * 0.1,
            "Idle Mean":                   idle_mean,
            "Idle Std":                    idle_mean * 0.3,
            "Idle Max":                    idle_mean * 2.0,
            "Idle Min":                    idle_mean * 0.05,
            "Protocol":                    float(proto_num),
        }

        # Build vector in the exact order the model was trained with
        vector = [feature_map.get(name, 0.0) for name in cls._feature_names]
        return np.array(vector, dtype=np.float32).reshape(1, -1)

    @classmethod
    def predict(
        cls,
        source_ip: str,
        destination_ip: str,
        protocol: str,
        data: str,
        bytes_sent: int,
    ) -> DetectionResult:
        """
        Run ML inference (or rule-based fallback) on a scan request.
        Returns a DetectionResult with prediction, confidence, severity, etc.
        """

        # --- Rule-based fast path for obvious attacks (also a safety net) ---
        data_str = data or ""

        if SQL_INJECTION_PATTERNS.search(data_str):
            return DetectionResult(
                prediction="malicious",
                threat_type="SQL Injection",
                confidence_score=0.97,
                severity="critical",
                alert_title="SQL Injection Attack Detected",
                alert_description="SQL injection payload identified in network data.",
            )
        if XSS_PATTERNS.search(data_str):
            return DetectionResult(
                prediction="malicious",
                threat_type="XSS",
                confidence_score=0.95,
                severity="high",
                alert_title="Cross-Site Scripting (XSS) Detected",
                alert_description="XSS payload identified in network request data.",
            )
        if COMMAND_INJECTION_PATTERNS.search(data_str):
            return DetectionResult(
                prediction="malicious",
                threat_type="Command Injection",
                confidence_score=0.96,
                severity="critical",
                alert_title="Command Injection Detected",
                alert_description="Shell command injection pattern identified in payload.",
            )

        # --- ML model inference ---
        if cls._clf is not None:
            features = cls._extract_features(
                source_ip, destination_ip, protocol, data_str, bytes_sent
            )
            features_scaled = cls._scaler.transform(features)

            pred_encoded = cls._clf.predict(features_scaled)[0]
            proba        = cls._clf.predict_proba(features_scaled)[0]
            confidence   = float(proba.max())
            label        = cls._le.inverse_transform([pred_encoded])[0]

            is_malicious = label != "BENIGN"

            # Keyword override: if ML says benign but clear attack keywords present, use rules
            if not is_malicious:
                keyword_result = cls._check_keywords(data_str, bytes_sent)
                if keyword_result is not None:
                    return keyword_result

            return DetectionResult(
                prediction="malicious" if is_malicious else "benign",
                threat_type=label if is_malicious else None,
                confidence_score=round(confidence, 4),
                severity=SEVERITY_MAP.get(label, "low") if is_malicious else "low",
                alert_title=ALERT_TITLES.get(label) if is_malicious else None,
                alert_description=ALERT_DESCRIPTIONS.get(label) if is_malicious else None,
            )

        # --- Rule-based fallback (model not trained yet) ---
        return cls._rule_based_fallback(source_ip, data_str, bytes_sent)


    @classmethod
    def _check_keywords(cls, data: str, bytes_sent: int) -> "DetectionResult | None":
        """
        Rule-based keyword scanner.  Returns a DetectionResult if a clear
        attack keyword is found in *data*, otherwise returns None.
        """
        dl = data.lower()
        keyword_rules = [
            (["syn flood", "syn-flood"],                  "DoS Hulk",     0.88, "critical"),
            (["nmap", "port scan", "portscan"],           "PortScan",     0.82, "medium"),
            (["patator", "hydra", "medusa", "brute force",
              "ssh patator", "ftp patator"],              "SSH-Patator",  0.85, "high"),
            (["ddos", "ddos flood", "flood attack",
              "amplification attack"],                    "DDoS",         0.90, "critical"),
            (["dos goldeneye", "goldeneye"],              "DoS GoldenEye",0.87, "high"),
            (["ftp brute", "ftp patator"],                "FTP-Patator",  0.83, "high"),
        ]
        for keywords, threat, conf, sev in keyword_rules:
            if any(kw in dl for kw in keywords):
                return DetectionResult(
                    prediction="malicious",
                    threat_type=threat,
                    confidence_score=conf,
                    severity=sev,
                    alert_title=ALERT_TITLES.get(threat, f"{threat} Detected"),
                    alert_description=ALERT_DESCRIPTIONS.get(threat, "Threat detected by rule engine."),
                )

        # High-byte-count heuristic
        if bytes_sent > 80_000:
            return DetectionResult(
                prediction="malicious",
                threat_type="DoS Hulk",
                confidence_score=0.72,
                severity="high",
                alert_title="DoS Hulk Attack Detected",
                alert_description="Abnormally high byte count indicates a potential DoS attack.",
            )

        return None   # Nothing matched — let ML result stand

    @classmethod
    def _rule_based_fallback(
        cls, source_ip: str, data: str, bytes_sent: int
    ) -> "DetectionResult":
        """Simple heuristic fallback when model is not loaded."""
        score = 0.0

        keywords = {
            "SYN flood": ("DoS Hulk",    0.85, "critical"),
            "port scan":  ("PortScan",    0.80, "medium"),
            "brute force":("FTP-Patator", 0.82, "high"),
            "ddos":       ("DDoS",        0.88, "critical"),
            "flood":      ("DoS Hulk",    0.78, "high"),
            "nmap":       ("PortScan",    0.75, "medium"),
        }
        for kw, (threat, conf, sev) in keywords.items():
            if kw.lower() in data.lower():
                return DetectionResult(
                    prediction="malicious",
                    threat_type=threat,
                    confidence_score=conf,
                    severity=sev,
                    alert_title=ALERT_TITLES.get(threat, f"{threat} Detected"),
                    alert_description=ALERT_DESCRIPTIONS.get(threat, "Threat detected by rule engine."),
                )

        if bytes_sent > 80_000:
            score += 0.3
        for prefix in SUSPICIOUS_IP_PREFIXES:
            if source_ip.startswith(prefix):
                score += 0.4
                break

        if score >= 0.5:
            return DetectionResult(
                prediction="malicious",
                threat_type="Anomaly",
                confidence_score=round(0.55 + score * 0.2, 4),
                severity="medium",
                alert_title="Anomalous Traffic Detected",
                alert_description="Traffic anomaly detected by heuristic rules.",
            )

        return DetectionResult(
            prediction="benign",
            threat_type=None,
            confidence_score=round(0.85 + (1 - score) * 0.1, 4),
            severity="low",
            alert_title=None,
            alert_description=None,
        )
