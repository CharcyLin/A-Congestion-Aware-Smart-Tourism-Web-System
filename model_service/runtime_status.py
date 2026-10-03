"""Process resource readings for deployment verification, without user data."""
import os
import platform
import resource


def runtime_status():
    peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    peak_mib = peak / (1024 * 1024) if platform.system() == "Darwin" else peak / 1024
    current_mib = None
    if platform.system() == "Linux":
        try:
            with open("/proc/self/status", encoding="ascii") as stream:
                for line in stream:
                    if line.startswith("VmRSS:"):
                        current_mib = int(line.split()[1]) / 1024
                        break
        except OSError:
            pass
    return {"pid": os.getpid(), "rss_mib": current_mib,
            "peak_rss_mib": round(peak_mib, 2), "runtime": "numpy"}
