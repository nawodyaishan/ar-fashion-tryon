"""
Test script for garment keypoint detection API.

Usage:
    python test_keypoint_api.py /path/to/garment.jpg
    python test_keypoint_api.py --url https://example.com/garment.jpg
"""
import sys
import requests
import json
from pathlib import Path


BASE_URL = "http://localhost:5000"


def test_health():
    """Test health endpoint."""
    print("Testing /health endpoint...")
    response = requests.get(f"{BASE_URL}/health")

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Health check passed")
        print(f"  Status: {data['status']}")
        print(f"  Version: {data['version']}")
        print(f"  Keypoint model loaded: {data.get('keypoint_model_loaded', False)}")

        if not data.get('keypoint_model_loaded', False):
            print("\n⚠️  WARNING: Keypoint model not loaded!")
            print("   Keypoint detection endpoints will not work.")
            return False
        return True
    else:
        print(f"✗ Health check failed: {response.status_code}")
        return False


def test_keypoint_detection_file(file_path):
    """Test keypoint detection with file upload."""
    print(f"\nTesting /detect_garment_keypoints with file: {file_path}")

    if not Path(file_path).exists():
        print(f"✗ File not found: {file_path}")
        return False

    with open(file_path, 'rb') as f:
        files = {'garment': f}
        response = requests.post(f"{BASE_URL}/detect_garment_keypoints", files=files)

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Keypoint detection successful")
        print(f"\n  Garment URL: {data['garment_url']}")
        print(f"  Image dimensions: {data['image_dimensions']['width']}x{data['image_dimensions']['height']}")
        print(f"  Detection confidence: {data['detection_confidence']:.2%}")
        print(f"  Total keypoints detected: {len(data['all_keypoints'])}")

        print(f"\n  Critical keypoints for alignment:")
        garment_kp = data['garment_keypoints']

        if garment_kp.get('left_shoulder'):
            ls = garment_kp['left_shoulder']
            print(f"    Left shoulder: ({ls['x']:.3f}, {ls['y']:.3f}) - confidence: {ls['confidence']:.2f}")

        if garment_kp.get('right_shoulder'):
            rs = garment_kp['right_shoulder']
            print(f"    Right shoulder: ({rs['x']:.3f}, {rs['y']:.3f}) - confidence: {rs['confidence']:.2f}")

        if garment_kp.get('shoulder_center'):
            sc = garment_kp['shoulder_center']
            print(f"    Shoulder center: ({sc['x']:.3f}, {sc['y']:.3f}) [derived]")

        if garment_kp.get('shoulder_width_pixel'):
            print(f"    Shoulder width: {garment_kp['shoulder_width_pixel']:.1f} pixels")

        if garment_kp.get('shoulder_angle_degrees'):
            print(f"    Shoulder angle: {garment_kp['shoulder_angle_degrees']:.1f}°")

        # Save full response for inspection
        output_file = "keypoint_detection_result.json"
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"\n  Full response saved to: {output_file}")

        return True
    else:
        print(f"✗ Keypoint detection failed: {response.status_code}")
        try:
            error = response.json()
            print(f"  Error: {error.get('detail', 'Unknown error')}")
        except:
            print(f"  Raw response: {response.text}")
        return False


def test_keypoint_detection_url(url):
    """Test keypoint detection with URL."""
    print(f"\nTesting /detect_garment_keypoints_by_url with URL: {url}")

    payload = {"source_url": url}
    response = requests.post(
        f"{BASE_URL}/detect_garment_keypoints_by_url",
        json=payload,
        headers={"Content-Type": "application/json"}
    )

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Keypoint detection successful")
        print(f"\n  Garment URL: {data['garment_url']}")
        print(f"  Image dimensions: {data['image_dimensions']['width']}x{data['image_dimensions']['height']}")
        print(f"  Detection confidence: {data['detection_confidence']:.2%}")
        print(f"  Total keypoints detected: {len(data['all_keypoints'])}")

        # Save full response
        output_file = "keypoint_detection_url_result.json"
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"\n  Full response saved to: {output_file}")

        return True
    else:
        print(f"✗ Keypoint detection failed: {response.status_code}")
        try:
            error = response.json()
            print(f"  Error: {error.get('detail', 'Unknown error')}")
        except:
            print(f"  Raw response: {response.text}")
        return False


def print_usage():
    """Print usage instructions."""
    print("Usage:")
    print("  python test_keypoint_api.py /path/to/garment.jpg")
    print("  python test_keypoint_api.py --url https://example.com/garment.jpg")
    print("\nOptions:")
    print("  --url        Test with image URL instead of file upload")
    print("  --help       Show this help message")


def main():
    """Main test function."""
    if len(sys.argv) < 2 or sys.argv[1] in ['--help', '-h']:
        print_usage()
        sys.exit(0)

    print("=" * 70)
    print("Garment Keypoint Detection API Test")
    print("=" * 70)

    # Test health first
    if not test_health():
        print("\n⚠️  Cannot proceed with keypoint detection tests.")
        print("   Please ensure the server is running and MMPose model is loaded.")
        sys.exit(1)

    # Test keypoint detection
    if sys.argv[1] == '--url':
        if len(sys.argv) < 3:
            print("\n✗ Error: URL argument required")
            print_usage()
            sys.exit(1)

        url = sys.argv[2]
        success = test_keypoint_detection_url(url)
    else:
        file_path = sys.argv[1]
        success = test_keypoint_detection_file(file_path)

    print("\n" + "=" * 70)
    if success:
        print("✓ All tests passed!")
    else:
        print("✗ Some tests failed")
    print("=" * 70)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
