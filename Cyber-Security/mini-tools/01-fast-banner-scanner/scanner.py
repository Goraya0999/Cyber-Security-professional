import socket
import sys
import concurrent.futures
from datetime import datetime

COMMON_PORTS = [
    21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445,
    993, 1723, 3306, 3389, 5432, 8080, 8443
]

open_ports = []

def grab(ip, port):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1)

        result = s.connect_ex((ip, port))

        if result == 0:
            banner = ""

            try:
                # Send request for web ports
                if port in [80, 8080, 443, 8443]:
                    s.send(b"GET / HTTP/1.0\r\n\r\n")

                banner = s.recv(1024).decode("utf-8", errors="ignore").strip()
            except:
                banner = ""

            return port, banner

        return port, None

    except:
        return port, None

    finally:
        try:
            s.close()
        except:
            pass


def main():
    target = input("Target IP/Hostname : ").strip()

    try:
        ip = socket.gethostbyname(target)
    except socket.gaierror:
        print("Invalid hostname")
        sys.exit()

    print(f"\n[*] Scanning {ip} - {datetime.now():%H:%M:%S}\n")
    print(f"{'Port':<8} {'Service':<12} {'Status':<18} {'Banner'}")
    print("-" * 80)

    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as ex:
        futures = {ex.submit(grab, ip, p): p for p in COMMON_PORTS}

        for f in concurrent.futures.as_completed(futures):
            port, banner = f.result()

            if banner is not None:
                open_ports.append(port)

                try:
                    svc = socket.getservbyport(port, "tcp") if port < 1024 else ""
                except:
                    svc = ""

                status = "OPEN" if banner else "OPEN (no banner)"

                print(f"{port:<8} {svc:<12} {status:<18} {banner[:45]}")

    print("\nScan Completed")
    print(f"Total Open Ports: {len(open_ports)}")
    print("Ports:", open_ports)


if __name__ == "__main__":
    main()