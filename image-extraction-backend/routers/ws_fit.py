"""
WebSocket router for real-time fit solver.
Provides low-latency pose → fit updates for AR try-on.
"""
import asyncio
import logging
import time
from typing import Dict, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.responses import JSONResponse
from starlette.websockets import WebSocketState
import orjson

from services.ws_fit_session import get_session_manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/fit/top")
async def websocket_fit_top(
    websocket: WebSocket,
    gsm_id: str = Query(..., description="Garment Shape Model ID"),
    token: Optional[str] = Query(None, description="Optional auth token")
):
    """
    WebSocket endpoint for real-time garment fitting.

    Protocol:
    - Client sends: {"type": "pose", "pose": {...}}
    - Server sends: {"type": "fit", "data": {...}, "qos": {...}}
    - Server sends: {"type": "error", "message": "..."}

    Query parameters:
    - gsm_id: Garment Shape Model ID (from /process/garment/top)
    - token: Optional authentication token

    Performance:
    - Latency: 20-40ms (vs 50-100ms HTTP)
    - Bandwidth: 8-12 KB/s (vs 96 KB/s HTTP)
    """
    session_manager = get_session_manager()
    session = None

    await websocket.accept()

    try:
        # Get GSM from memory cache only (no Cloudinary fetch)
        gsm = session_manager.gsm_cache.get(gsm_id)

        if not gsm:
            # GSM not in cache - this is expected after server restart
            logger.warning(f"GSM {gsm_id} not in cache")

            error_msg = {
                "type": "error",
                "message": f"GSM {gsm_id} not found. Please re-upload garment.",
                "code": "GSM_NOT_FOUND"
            }
            await websocket.send_text(orjson.dumps(error_msg).decode())
            await websocket.close(code=1000, reason="GSM not found")
            return

        # Create session with GSM
        session = session_manager.create_session(gsm_id, gsm)

        # Send acknowledgment
        ack_msg = {
            "type": "ack",
            "session_id": session.session_id,
            "tick_hz": 12,
            "gsm_id": gsm_id
        }
        await websocket.send_text(orjson.dumps(ack_msg).decode())

        logger.info(f"[{session.session_id}] WebSocket connected with GSM {gsm_id}")

        # Main message loop
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0
                )

                msg = orjson.loads(data)
                msg_type = msg.get("type")

                if msg_type == "pose":
                    session.update_pose(msg)
                    fit_result = session.solve()

                    if fit_result:
                        fit_msg = {
                            "type": "fit",
                            "seq": msg.get("seq", 0),
                            **fit_result
                        }
                        await websocket.send_text(orjson.dumps(fit_msg).decode())

                elif msg_type == "bye":
                    logger.info(f"[{session.session_id}] Client sent bye")
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await websocket.send_text(orjson.dumps({"type": "bye", "reason": "client_requested"}).decode())
                    break

                else:
                    # Unknown message type
                    if websocket.client_state == WebSocketState.CONNECTED:
                        error_msg = {"type": "error", "message": f"Unknown message type: {msg_type}"}
                        await websocket.send_text(orjson.dumps(error_msg).decode())

            except asyncio.TimeoutError:
                logger.info(f"[{session.session_id}] Idle timeout")
                if websocket.client_state == WebSocketState.CONNECTED:
                    await websocket.send_text(orjson.dumps({"type": "bye", "reason": "idle_timeout"}).decode())
                break

            except WebSocketDisconnect:
                logger.info(f"[{session.session_id}] Client disconnected")
                break

            except orjson.JSONDecodeError as e:
                logger.error(f"[{session.session_id}] JSON decode error: {e}")
                if websocket.client_state == WebSocketState.CONNECTED:
                    error_msg = {"type": "error", "message": f"Invalid JSON: {str(e)}"}
                    await websocket.send_text(orjson.dumps(error_msg).decode())

            except Exception as e:
                logger.error(f"[{session.session_id}] Error: {e}", exc_info=True)
                if websocket.client_state == WebSocketState.CONNECTED:
                    error_msg = {"type": "error", "message": str(e)}
                    await websocket.send_text(orjson.dumps(error_msg).decode())

    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)

    finally:
        if session:
            session_manager.remove_session(session.session_id)

        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close()


@router.get("/ws/stats")
async def websocket_stats():
    """
    Get WebSocket statistics.

    Returns:
    - total_sessions: Number of active sessions
    - active_sessions: Number of sessions in tracking mode
    - cached_gsms: Number of GSMs in cache
    - sessions: List of session stats
    """
    session_manager = get_session_manager()
    stats = session_manager.get_stats()

    return JSONResponse(stats)


async def cleanup_idle_sessions():
    """
    Background task to cleanup idle sessions.
    Runs every 30 seconds and removes sessions with no activity for 30+ seconds.
    """
    session_manager = get_session_manager()

    while True:
        try:
            await asyncio.sleep(30)
            removed = session_manager.cleanup_idle_sessions(timeout_sec=30.0)

            if removed > 0:
                logger.info(f"Cleaned up {removed} idle sessions")

        except Exception as e:
            logger.error(f"Cleanup task error: {e}", exc_info=True)
