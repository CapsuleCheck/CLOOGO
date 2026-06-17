"""ASGI entrypoint for Railway / uvicorn (default: main:app)."""

from server import app

__all__ = ["app"]
