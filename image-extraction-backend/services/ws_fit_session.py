"""
WebSocket Fit Session Manager
Maintains per-session state (EMA filters, hysteresis, GSM cache)
"""
import time
import logging
import secrets
from typing import Dict, Optional
from services.fit_solver import get_solver

logger = logging.getLogger(__name__)


class FitSession:
    """Per-user WebSocket session for fit solver."""

    def __init__(self, session_id: str, gsm_id: str, gsm: Dict):
        self.session_id = session_id
        self.gsm_id = gsm_id
        self.gsm = gsm

        # Solver instance (with state)
        self.solver = get_solver()

        # EMA state
        self.ema_similarity = None
        self.ema_warp = None

        # Hysteresis state
        self.is_tracking = False

        # Metrics
        self.frame_count = 0
        self.drop_count = 0
        self.last_pose_time = time.time()
        self.last_fit_time = 0

        # Latest queued pose (for coalescing)
        self.latest_pose = None
        self.solving = False

        logger.info(f"[{session_id}] Session created for gsm_id={gsm_id}")

    def update_pose(self, pose: Dict) -> None:
        """
        Update latest pose (coalescing: latest wins).
        If already solving, this replaces the queued pose.
        """
        if self.solving and self.latest_pose is not None:
            # Drop old pose (coalescing)
            self.drop_count += 1

        self.latest_pose = pose
        self.last_pose_time = time.time()
        self.frame_count += 1

    def can_solve(self) -> bool:
        """Check if ready to solve (not already solving, has pose)."""
        return not self.solving and self.latest_pose is not None

    def solve(self) -> Optional[Dict]:
        """
        Solve fit for latest pose.
        Returns fit result or None if not ready.
        """
        if not self.can_solve():
            return None

        self.solving = True
        pose = self.latest_pose
        self.latest_pose = None  # Consume pose

        start_time = time.time()

        try:
            # Use solver with session state
            result = self.solver.solve(
                gsm=self.gsm,
                pose=pose.get("pose", {}),
                prev_state={
                    "similarity": self.ema_similarity,
                    "warp": self.ema_warp
                } if self.ema_similarity else None,
                session_id=self.session_id
            )

            # Update EMA state
            if result["mode"] == "tracking" and result["similarity"]:
                self.ema_similarity = result["similarity"]
                self.ema_warp = result["warp"]
                self.is_tracking = True
            else:
                self.is_tracking = False

            # Add QoS metrics
            proc_ms = (time.time() - start_time) * 1000
            result["qos"] = {
                "proc_ms": round(proc_ms, 2),
                "frame_count": self.frame_count,
                "drop_rate": round(self.drop_count / max(self.frame_count, 1), 3)
            }

            self.last_fit_time = time.time()

            return result

        except Exception as e:
            logger.error(f"[{self.session_id}] Solve failed: {e}", exc_info=True)
            return None
        finally:
            self.solving = False

    def is_idle(self, timeout_sec: float = 30.0) -> bool:
        """Check if session is idle (no pose for timeout_sec)."""
        return (time.time() - self.last_pose_time) > timeout_sec

    def get_stats(self) -> Dict:
        """Get session statistics."""
        return {
            "session_id": self.session_id,
            "gsm_id": self.gsm_id,
            "frame_count": self.frame_count,
            "drop_count": self.drop_count,
            "is_tracking": self.is_tracking,
            "uptime_sec": round(time.time() - self.last_pose_time, 2)
        }


class SessionManager:
    """Manage multiple WebSocket sessions."""

    def __init__(self):
        self.sessions: Dict[str, FitSession] = {}
        self.gsm_cache: Dict[str, Dict] = {}  # Cache GSMs by gsm_id

    def create_session(self, gsm_id: str, gsm: Optional[Dict] = None) -> FitSession:
        """Create new fit session."""
        session_id = secrets.token_hex(8)

        # Get GSM from cache or use provided
        if gsm is None:
            gsm = self.gsm_cache.get(gsm_id)
            if gsm is None:
                raise ValueError(f"GSM {gsm_id} not found in cache")
        else:
            # Cache GSM
            if gsm_id not in self.gsm_cache:
                self.gsm_cache[gsm_id] = gsm

        session = FitSession(session_id, gsm_id, gsm)
        self.sessions[session_id] = session

        return session

    def get_session(self, session_id: str) -> Optional[FitSession]:
        """Get existing session."""
        return self.sessions.get(session_id)

    def remove_session(self, session_id: str) -> None:
        """Remove session."""
        if session_id in self.sessions:
            logger.info(f"[{session_id}] Session removed")
            del self.sessions[session_id]

    def add_gsm_to_cache(self, gsm_id: str, gsm: Dict) -> None:
        """Add GSM to cache for WebSocket sessions."""
        self.gsm_cache[gsm_id] = gsm
        logger.info(f"GSM {gsm_id} added to WebSocket cache")

    def cleanup_idle_sessions(self, timeout_sec: float = 30.0) -> int:
        """Remove idle sessions. Returns number removed."""
        idle_sessions = [
            sid for sid, sess in self.sessions.items()
            if sess.is_idle(timeout_sec)
        ]

        for sid in idle_sessions:
            self.remove_session(sid)

        return len(idle_sessions)

    def get_stats(self) -> Dict:
        """Get global statistics."""
        return {
            "total_sessions": len(self.sessions),
            "active_sessions": sum(1 for s in self.sessions.values() if s.is_tracking),
            "cached_gsms": len(self.gsm_cache),
            "sessions": [s.get_stats() for s in self.sessions.values()]
        }


# Global singleton
_session_manager = None


def get_session_manager() -> SessionManager:
    """Get global session manager."""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager
