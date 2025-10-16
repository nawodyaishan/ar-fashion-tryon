"""
WebSocket router for real-time fit solver.
Provides low-latency pose → fit updates for AR try-on.
"""
import asyncio
import logging
import time
from typing import Dict, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse
import orjson

from services.ws_fit_session import get_session_manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/fit/top")
async def websocket_fit_top(websocket: WebSocket, gsm_id: str):
    """
    WebSocket endpoint for real-time garment fitting.

    Protocol:
    - Client sends: {"type": "pose", "pose": {...}}
    - Server sends: {"type": "fit", "data": {...}, "qos": {...}}
    - Server sends: {"type": "error", "message": "..."}

    Query parameters:
    - gsm_id: Garment Shape Model ID (from /process/garment/top)

    Performance:
    - Latency: 20-40ms (vs 50-100ms HTTP)
    - Bandwidth: 8-12 KB/s (vs 96 KB/s HTTP)
    """
    await websocket.accept()

    session_manager = get_session_manager()
    session = None

    try:
        # Create session and get GSM from cache
        try:
            session = session_manager.create_session(gsm_id)
        except ValueError as e:
            # GSM not found in cache
            await websocket.send_json({
                "type": "error",
                "message": f"GSM not found: {str(e)}. Call /process/garment/top first."
            })
            await websocket.close()
            return

        # Send acknowledgment
        await websocket.send_json({
            "type": "ack",
            "session_id": session.session_id,
            "gsm_id": gsm_id
        })

        logger.info(f"[{session.session_id}] WebSocket connected")

        # Message loop
        while True:
            try:
                # Receive pose message
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0  # Timeout after 30s of inactivity
                )

                message = orjson.loads(data)
                msg_type = message.get("type")

                if msg_type == "pose":
                    # Update pose (coalescing)
                    session.update_pose(message)

                    # Solve if not already solving
                    if session.can_solve():
                        result = session.solve()

                        if result:
                            # Send fit result
                            response = orjson.dumps({
                                "type": "fit",
                                "data": result
                            }).decode('utf-8')

                            await websocket.send_text(response)
                        else:
                            # Solve failed
                            await websocket.send_json({
                                "type": "error",
                                "message": "Fit solver failed"
                            })

                elif msg_type == "bye":
                    # Graceful disconnect
                    logger.info(f"[{session.session_id}] Client requested disconnect")
                    break

                else:
                    # Unknown message type
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Unknown message type: {msg_type}"
                    })

            except asyncio.TimeoutError:
                # Timeout - close connection
                logger.info(f"[{session.session_id}] Timeout - no pose for 30s")
                await websocket.send_json({
                    "type": "error",
                    "message": "Timeout - no pose received for 30 seconds"
                })
                break

            except orjson.JSONDecodeError as e:
                # Invalid JSON
                await websocket.send_json({
                    "type": "error",
                    "message": f"Invalid JSON: {str(e)}"
                })

    except WebSocketDisconnect:
        logger.info(f"[{session.session_id if session else 'unknown'}] Client disconnected")

    except Exception as e:
        logger.error(f"[{session.session_id if session else 'unknown'}] WebSocket error: {e}", exc_info=True)
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"Internal error: {str(e)}"
            })
        except:
            pass

    finally:
        # Cleanup session
        if session:
            stats = session.get_stats()
            logger.info(
                f"[{session.session_id}] Session closed. "
                f"Frames: {stats['frame_count']}, "
                f"Drops: {stats['drop_count']}, "
                f"Tracking: {stats['is_tracking']}"
            )
            session_manager.remove_session(session.session_id)

        try:
            await websocket.close()
        except:
            pass


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
