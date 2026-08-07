"""
Run this once to clear all __pycache__ directories in the backend.
Usage: python clear_cache.py
"""
import shutil, os, pathlib

root = pathlib.Path(__file__).parent
removed = 0
for d in root.rglob("__pycache__"):
    shutil.rmtree(d)
    print(f"Removed: {d}")
    removed += 1

print(f"\nDone — removed {removed} __pycache__ directories.")
