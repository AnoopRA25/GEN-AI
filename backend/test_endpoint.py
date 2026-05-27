import requests
import cv2
import numpy as np

# Create a mock image
img = np.zeros((256, 256, 3), dtype=np.uint8)
cv2.circle(img, (128, 128), 50, (255, 255, 255), -1)
cv2.imwrite("mock_mri.png", img)

# Send POST request
with open("mock_mri.png", "rb") as f:
    files = {"file": ("mock_mri.png", f, "image/png")}
    response = requests.post("http://127.0.0.1:8000/predict", files=files)

print("Status Code:", response.status_code)
if response.status_code == 200:
    data = response.json()
    print("Tumor Detected:", data.get("tumor_detected"))
    print("Insight:", data.get("insight"))
else:
    print("Error:", response.text)
