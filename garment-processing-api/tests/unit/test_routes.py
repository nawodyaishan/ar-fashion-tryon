from pathlib import Path

import pytest


@pytest.mark.parametrize("route", ["/detect_garment_type", "/classify_garment"])
@pytest.mark.parametrize(
    "filename,data,status", [("bad.txt", b"x", 400), ("bad.png", b"invalid", 400)]
)
def test_invalid_upload(api, route, filename, data, status):
    module, client = api
    response = client.post(route, files={"garment": (filename, data, "image/png")})
    assert response.status_code == status
    assert "detail" in response.json()
    module.classify_image.assert_not_called()
    module.upload_bytes.assert_not_called()


def test_missing_field(api, png):
    _, client = api
    assert (
        client.post("/detect_garment_type", files={"image": ("image.png", png)}).status_code == 422
    )


def test_oversized_upload(api, monkeypatch, png):
    module, client = api
    monkeypatch.setattr(module, "MAX_CONTENT_BYTES", len(png) - 1)
    response = client.post("/detect_garment_type", files={"garment": ("image.png", png)})
    assert response.status_code == 413
    module.classify_image.assert_not_called()


def test_classification_success_and_cleanup(api, png):
    module, client = api
    response = client.post(
        "/detect_garment_type", files={"garment": ("image.png", png, "image/png")}
    )
    assert response.status_code == 200
    assert response.json()["label"] == "tshirt"
    assert response.json()["confidence"] == 0.9877
    assert response.json()["file_size_bytes"] == len(png)
    assert not module.classify_image.call_args.args[0].exists()
    module.upload_bytes.assert_not_called()


def test_classifier_failure(api, png):
    module, client = api
    module.classify_image.side_effect = RuntimeError("fixture classifier unavailable")
    response = client.post("/detect_garment_type", files={"garment": ("image.png", png)})
    assert response.status_code == 500
    assert "fixture classifier unavailable" in response.json()["detail"]
    assert not module.classify_image.call_args.args[0].exists()


def test_extract_success(api, png):
    module, client = api
    response = client.post("/classify_garment", files={"garment": ("image.png", png)})
    assert response.status_code == 200
    assert response.json()["cutout_url"] == "https://fixture.invalid/image.png"
    assert module.upload_bytes.call_count == 2
    assert not module.remove_background.call_args.args[0].exists()


def test_upload_failure(api, png):
    module, client = api
    module.upload_bytes.side_effect = RuntimeError("fixture upload unavailable")
    response = client.post("/classify_garment", files={"garment": ("image.png", png)})
    assert response.status_code == 500
    assert "Upload failed" in response.json()["detail"]
    module.classify_image.assert_not_called()


@pytest.mark.parametrize("failure", [False, True])
def test_tryon_parameters_and_cleanup(api, png, failure):
    module, client = api
    if failure:
        module.call_gradio_api.side_effect = RuntimeError("fixture provider unavailable")
    response = client.post(
        "/virtual_tryon",
        params={
            "num_inference_steps": 12,
            "guidance_scale": 1.5,
            "seed": 7,
            "process_garment": "false",
        },
        data={"cloth_type": "lower"},
        files={"person_image": ("person.png", png), "garment_image": ("garment.png", png)},
    )
    assert response.status_code == (500 if failure else 200)
    call = module.call_gradio_api.call_args.kwargs
    assert call["num_inference_steps"] == 12
    assert call["guidance_scale"] == 1.5
    assert call["seed"] == 7
    assert call["cloth_type"] == "lower"
    assert not Path(call["person_img_path"]).exists()
    assert not Path(call["cloth_img_path"]).exists()
    module.remove_background.assert_not_called()
    if failure:
        assert response.json()["error"] == "fixture provider unavailable"
    else:
        assert response.json()["success"] is True
        assert response.json()["parameters"]["seed"] == 7
        assert response.json()["result_url"] == "https://fixture.invalid/image.png"
