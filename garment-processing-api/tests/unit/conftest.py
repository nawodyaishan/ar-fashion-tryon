import importlib
import io
import socket
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi.testclient import TestClient
from PIL import Image


@pytest.fixture
def png():
    stream = io.BytesIO()
    Image.new("RGB", (8, 8), "blue").save(stream, format="PNG")
    return stream.getvalue()


@pytest.fixture
def api(monkeypatch, png):
    def forbidden(*args, **kwargs):
        raise AssertionError("External network access is forbidden in unit tests")

    monkeypatch.setattr(socket.socket, "connect", forbidden)
    for key in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "HF_TOKEN"):
        monkeypatch.delenv(key, raising=False)
    module = importlib.import_module("app")
    monkeypatch.setattr(module, "load_model_and_config", Mock())
    monkeypatch.setattr(module, "classify_image", Mock(return_value=("tshirt", 0.98765)))
    monkeypatch.setattr(
        module,
        "upload_bytes",
        Mock(return_value={"secure_url": "https://fixture.invalid/image.png"}),
    )
    monkeypatch.setattr(module, "download_url_bytes", Mock(return_value=png))
    monkeypatch.setattr(module, "remove_background", Mock(return_value=Image.open(io.BytesIO(png))))
    monkeypatch.setattr(module, "call_gradio_api", AsyncMock(return_value=png))
    with TestClient(module.app, raise_server_exceptions=False) as client:
        module.load_model_and_config.assert_called_once()
        yield module, client
