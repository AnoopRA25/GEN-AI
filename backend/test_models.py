import torch
from model_utils import load_esrgan, load_unet
import traceback

print("Testing models load...")
try:
    esrgan = load_esrgan('models/best_esrgan_generator.pth', 'cpu')
    if esrgan:
        print("ESRGAN loaded successfully.")
    else:
        print("ESRGAN failed to load.")
except Exception as e:
    print("Error loading ESRGAN:")
    traceback.print_exc()

try:
    unet = load_unet('models/best_unetplusplus_v2.pth', 'cpu')
    if unet:
        print("UNet++ loaded successfully.")
    else:
        print("UNet++ failed to load.")
except Exception as e:
    print("Error loading UNet++:")
    traceback.print_exc()
