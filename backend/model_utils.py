"""
model_utils.py — ESRGAN + U-Net++ loader & inference
Fully auto-detects: nf, gc, nb, upsampling style from checkpoint.
"""
import logging
import numpy as np
import cv2
import torch
import torch.nn as nn
import torch.nn.functional as F
import segmentation_models_pytorch as smp

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# ARCHITECTURE
# ─────────────────────────────────────────────────────────────────

class ResidualDenseBlock(nn.Module):
    def __init__(self, nf, gc, bias=True):
        super().__init__()
        self.conv1 = nn.Conv2d(nf,       gc, 3, 1, 1, bias=bias)
        self.conv2 = nn.Conv2d(nf+gc,    gc, 3, 1, 1, bias=bias)
        self.conv3 = nn.Conv2d(nf+2*gc,  gc, 3, 1, 1, bias=bias)
        self.conv4 = nn.Conv2d(nf+3*gc,  gc, 3, 1, 1, bias=bias)
        self.conv5 = nn.Conv2d(nf+4*gc,  nf, 3, 1, 1, bias=bias)
        self.lrelu = nn.LeakyReLU(0.2, inplace=True)

    def forward(self, x):
        x1 = self.lrelu(self.conv1(x))
        x2 = self.lrelu(self.conv2(torch.cat([x, x1], 1)))
        x3 = self.lrelu(self.conv3(torch.cat([x, x1, x2], 1)))
        x4 = self.lrelu(self.conv4(torch.cat([x, x1, x2, x3], 1)))
        x5 = self.conv5(torch.cat([x, x1, x2, x3, x4], 1))
        return x5 * 0.2 + x


class RRDB(nn.Module):
    def __init__(self, nf, gc):
        super().__init__()
        self.RDB1 = ResidualDenseBlock(nf, gc)
        self.RDB2 = ResidualDenseBlock(nf, gc)
        self.RDB3 = ResidualDenseBlock(nf, gc)

    def forward(self, x):
        out = self.RDB1(x)
        out = self.RDB2(out)
        out = self.RDB3(out)
        return out * 0.2 + x


class RRDBNet(nn.Module):
    """
    Supports both upsampling styles:
      has_upconv=True  → upconv1 + upconv2 (interpolate style)
      has_upconv=False → no upsample layers (same-resolution output)
    """
    def __init__(self, in_nc=3, out_nc=3, nf=32, gc=16, nb=3, has_upconv=True):
        super().__init__()
        self.has_upconv = has_upconv
        self.conv_first = nn.Conv2d(in_nc, nf, 3, 1, 1)
        self.RRDB_trunk = nn.Sequential(*[RRDB(nf, gc) for _ in range(nb)])
        self.trunk_conv = nn.Conv2d(nf, nf, 3, 1, 1)
        if has_upconv:
            self.upconv1 = nn.Conv2d(nf, nf, 3, 1, 1)
            self.upconv2 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.HRconv   = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_last = nn.Conv2d(nf, out_nc, 3, 1, 1)
        self.lrelu    = nn.LeakyReLU(0.2, inplace=True)

    def forward(self, x):
        fea   = self.conv_first(x)
        trunk = self.trunk_conv(self.RRDB_trunk(fea))
        fea   = fea + trunk
        if self.has_upconv:
            fea = self.lrelu(self.upconv1(F.interpolate(fea, scale_factor=2, mode='nearest')))
            fea = self.lrelu(self.upconv2(F.interpolate(fea, scale_factor=2, mode='nearest')))
        return self.conv_last(self.lrelu(self.HRconv(fea)))


# ─────────────────────────────────────────────────────────────────
# CHECKPOINT HELPERS
# ─────────────────────────────────────────────────────────────────

def _unwrap(raw) -> dict:
    if isinstance(raw, dict):
        for k in ("state_dict", "model", "params", "generator"):
            if k in raw and isinstance(raw[k], dict):
                return raw[k]
        return raw
    if hasattr(raw, "state_dict"):
        return raw.state_dict()
    raise ValueError("Cannot extract state_dict")


def _remap(sd: dict) -> dict:
    rules = {
        "rrdb_blocks.": "RRDB_trunk.",
        ".rdb1.": ".RDB1.",
        ".rdb2.": ".RDB2.",
        ".rdb3.": ".RDB3.",
        "hr_conv.": "HRconv.",
        "final_conv.": "conv_last.",
    }
    out = {}
    for k, v in sd.items():
        nk = k
        for old, new in rules.items():
            nk = nk.replace(old, new)
        out[nk] = v
    return out


def _detect(sd: dict):
    """Returns (nf, gc, nb, has_upconv) read from checkpoint tensors."""
    nf = sd["conv_first.bias"].shape[0]          # e.g. 32

    # gc = output channels of first dense conv
    gc = sd["RRDB_trunk.0.RDB1.conv1.bias"].shape[0]   # e.g. 16

    # nb = how many RRDB blocks exist
    indices = set()
    for k in sd:
        if k.startswith("RRDB_trunk."):
            p = k.split(".")
            if len(p) >= 2 and p[1].isdigit():
                indices.add(int(p[1]))
    nb = max(indices) + 1 if indices else 3

    has_upconv = "upconv1.weight" in sd

    logger.info(f"Detected → nf={nf}, gc={gc}, nb={nb}, has_upconv={has_upconv}")
    return nf, gc, nb, has_upconv


# ─────────────────────────────────────────────────────────────────
# PUBLIC LOADERS
# ─────────────────────────────────────────────────────────────────

def load_esrgan(path: str, device: torch.device) -> RRDBNet:
    logger.info(f"Loading ESRGAN from: {path}")
    raw = torch.load(path, map_location=device)
    sd  = _remap(_unwrap(raw))

    nf, gc, nb, has_upconv = _detect(sd)
    model = RRDBNet(in_nc=3, out_nc=3, nf=nf, gc=gc, nb=nb, has_upconv=has_upconv)

    # strict=True will now work because model matches checkpoint exactly
    missing, unexpected = model.load_state_dict(sd, strict=False)
    if missing:
        logger.warning(f"Missing  ({len(missing)}): {missing}")
    if unexpected:
        logger.warning(f"Unexpected ({len(unexpected)}): {unexpected}")

    model.to(device).eval()
    logger.info("✓ ESRGAN loaded")
    return model


def load_unet(path: str, device: torch.device) -> smp.UnetPlusPlus:
    logger.info(f"Loading U-Net++ from: {path}")
    raw = torch.load(path, map_location=device)

    # 1. Extract state_dict
    if isinstance(raw, dict):
        sd = raw.get("model_state") or raw.get("state_dict") or raw.get("model") or raw
    else:
        sd = raw

    # 2. Detect encoder name
    encoder_name = "resnet34"
    if isinstance(raw, dict) and "encoder" in raw and isinstance(raw["encoder"], str):
        encoder_name = raw["encoder"]
    else:
        # Heuristic check
        if any("conv_stem" in k or "_blocks" in k for k in sd.keys()):
            encoder_name = "efficientnet-b4"

    # 3. Detect attention type
    decoder_attention_type = None
    if any("attention" in k or "cSE" in k or "sSE" in k for k in sd.keys()):
        decoder_attention_type = "scse"

    logger.info(f"Auto-configured U-Net++ → encoder={encoder_name}, attention={decoder_attention_type}")

    model = smp.UnetPlusPlus(
        encoder_name=encoder_name,
        encoder_weights=None,
        in_channels=3,
        classes=1,
        activation=None,
        decoder_attention_type=decoder_attention_type,
    )
    
    missing, unexpected = model.load_state_dict(sd, strict=False)
    if missing:
        logger.warning(f"U-Net++ Missing keys: {len(missing)}")
    if unexpected:
        logger.warning(f"U-Net++ Unexpected keys: {len(unexpected)}")

    model.to(device).eval()
    logger.info("✓ U-Net++ loaded")
    return model


# ─────────────────────────────────────────────────────────────────
# INFERENCE
# ─────────────────────────────────────────────────────────────────

def enhance_image(img_bgr: np.ndarray, model: RRDBNet,
                  device: torch.device) -> np.ndarray:
    h, w = img_bgr.shape[:2]
    rgb  = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    t    = torch.from_numpy(rgb).permute(2, 0, 1).unsqueeze(0).to(device)
    with torch.no_grad():
        out = model(t).clamp(0, 1)
    out_np  = out.squeeze(0).permute(1, 2, 0).cpu().numpy()
    out_bgr = cv2.cvtColor((out_np * 255).astype(np.uint8), cv2.COLOR_RGB2BGR)
    # always return at original resolution
    return cv2.resize(out_bgr, (w, h), interpolation=cv2.INTER_LINEAR)


def predict_mask(img_bgr: np.ndarray, model: smp.UnetPlusPlus,
                 device: torch.device,
                 input_size=(256, 256)) -> np.ndarray:
    h, w    = img_bgr.shape[:2]
    resized = cv2.resize(img_bgr, input_size)
    rgb     = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    mean    = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std     = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    rgb     = (rgb - mean) / std
    t = torch.from_numpy(rgb).permute(2, 0, 1).unsqueeze(0).float().to(device)
    with torch.no_grad():
        prob = torch.sigmoid(model(t)).squeeze().cpu().numpy()
    return cv2.resize(prob, (w, h), interpolation=cv2.INTER_LINEAR).astype(np.float32)