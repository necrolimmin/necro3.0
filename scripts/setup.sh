#!/bin/bash
set -e

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.example .env
  SECRET=$(python -c "import secrets; print(secrets.token_hex(32))")
  python - <<PY
from pathlib import Path
p = Path(".env")
text = p.read_text(encoding="utf-8", errors="ignore")
text = text.replace("change_me_64_char_random_secret_key_here_very_long", "$SECRET")
p.write_text(text, encoding="utf-8")
PY
fi

mkdir -p backend/media backend/hls
python -m venv .venv
source .venv/Scripts/activate 2>/dev/null || source .venv/bin/activate
python -m pip install -r backend/requirements.txt
cd backend
python manage.py migrate

echo "NovaStream Django backend is ready."
echo "Run backend:  cd backend && python manage.py runserver 8000"
echo "Run frontend: cd frontend && npm install && npm run dev"
