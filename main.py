import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DATA_FILE = BASE_DIR / "data" / "animals.json"

app = FastAPI(title="Animal Explorer API")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def home():
    return FileResponse(STATIC_DIR / "index.html")


def read_dataset() -> dict[str, Any]:
    if not DATA_FILE.exists():
        raise HTTPException(
            status_code=503,
            detail="Dataset file not found. Add data/animals.json to the project.",
        )

    try:
        data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not read data/animals.json.",
        ) from exc

    # Hỗ trợ JSON có dạng danh sách trực tiếp hoặc object chứa key "animals".
    if isinstance(data, list):
        data = {"animals": data}

    if not isinstance(data, dict) or not isinstance(data.get("animals"), list):
        raise HTTPException(
            status_code=500,
            detail='Dataset must be a list or an object containing an "animals" list.',
        )

    return data


def get_status(animal: dict[str, Any]) -> str:
    value = animal.get("conservationStatus")
    if value is None or not str(value).strip():
        return "Unknown"
    return str(value).strip()


@app.get("/api/statuses")
async def list_statuses():
    data = read_dataset()
    statuses = sorted(
        {get_status(animal) for animal in data["animals"]},
        key=str.casefold,
    )
    return {"statuses": statuses}


@app.get("/api/animals")
async def list_animals(
    status: str | None = Query(default=None),
):
    data = read_dataset()
    animals = data["animals"]

    if status:
        wanted_status = status.strip().casefold()
        animals = [
            animal for animal in animals
            if get_status(animal).casefold() == wanted_status
        ]

    return {
        "meta": data.get("meta", {}),
        "total": len(animals),
        "animals": animals,
    }
