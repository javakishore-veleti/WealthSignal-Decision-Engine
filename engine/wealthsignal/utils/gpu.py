"""
Accelerator (GPU / MPS / CPU) detection and diagnostics.

Used by:
  - Training loops: call `select_device()` to get a torch.device for the
    best available accelerator.
  - Local bootstrap: run `python -m engine.wealthsignal.utils.gpu` to
    print a full report — part of the PT-01 env-setup validation.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass


@dataclass(frozen=True)
class AcceleratorInfo:
    """Structured snapshot of the detected accelerator."""

    available: bool
    backend: str  # 'cuda' | 'mps' | 'cpu'
    display_name: str
    device_count: int
    total_memory_gb: float | None

    def as_device(self) -> str:
        """Return the torch-compatible device string ('cuda', 'mps', or 'cpu')."""
        return self.backend


def detect_accelerator() -> AcceleratorInfo:
    """Detect the best available accelerator without raising when torch is missing."""
    try:
        import torch
    except ImportError:
        return AcceleratorInfo(
            available=False,
            backend="cpu",
            display_name="PyTorch not installed",
            device_count=0,
            total_memory_gb=None,
        )

    if torch.cuda.is_available():
        props = torch.cuda.get_device_properties(0)
        return AcceleratorInfo(
            available=True,
            backend="cuda",
            display_name=torch.cuda.get_device_name(0),
            device_count=torch.cuda.device_count(),
            total_memory_gb=props.total_memory / 1024**3,
        )

    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return AcceleratorInfo(
            available=True,
            backend="mps",
            display_name="Apple Metal Performance Shaders",
            device_count=1,
            total_memory_gb=None,
        )

    return AcceleratorInfo(
        available=False,
        backend="cpu",
        display_name="CPU (no accelerator detected)",
        device_count=0,
        total_memory_gb=None,
    )


def select_device() -> str:
    """Return the torch device string for the best available accelerator."""
    return detect_accelerator().as_device()


def print_report() -> int:
    """CLI: print a human-readable accelerator report. Exit code 0 regardless."""
    info = detect_accelerator()

    status = "✔ available" if info.available else "✖ unavailable"
    mem = f"{info.total_memory_gb:.1f} GB" if info.total_memory_gb is not None else "—"

    print("═══ WealthSignal · Accelerator report ═══")
    print(f"  Backend     : {info.backend}")
    print(f"  Status      : {status}")
    print(f"  Display     : {info.display_name}")
    print(f"  Device count: {info.device_count}")
    print(f"  Total memory: {mem}")

    try:
        import torch

        print(f"  torch       : {torch.__version__}")
        if info.backend == "cuda":
            print(f"  CUDA        : {torch.version.cuda}")
    except ImportError:
        print("  torch       : not installed — run `npm run setup:local:python`")

    print("═══════════════════════════════════════════")
    return 0


if __name__ == "__main__":
    sys.exit(print_report())
