# NovaStream

NovaStream is now a local Django + Next.js streaming project. Docker, PostgreSQL, Redis, Celery, and Nginx are no longer required for development.

## Stack

- Backend: Django, SQLite, signed Bearer tokens
- Frontend: Next.js 14
- Media: local `backend/media`
- Optional HLS: local `backend/hls`

## Quick Start On Windows

```powershell
cd "C:\Users\necro\Downloads\Telegram Desktop\novastream"
powershell -ExecutionPolicy Bypass -File .\scripts\setup-local.ps1
```

Start the backend:

```powershell
cd "C:\Users\necro\Downloads\Telegram Desktop\novastream\backend"
..\.venv\Scripts\python.exe manage.py runserver 8000
```

Start the frontend in another terminal:

```powershell
cd "C:\Users\necro\Downloads\Telegram Desktop\novastream\frontend"
npm install
npm run dev
```

Open `http://localhost:3000`.

## Admin User

Register in the app first, then promote your account:

```powershell
cd "C:\Users\necro\Downloads\Telegram Desktop\novastream"
powershell -ExecutionPolicy Bypass -File .\scripts\make-admin.ps1 your@email.com
```

You can also use Django admin at `http://localhost:8000/django-admin/`.

## API

The frontend-facing API remains under `http://localhost:8000/api/v1`:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /media/`
- `GET /media/featured`
- `GET /media/continue-watching`
- `GET /media/{id}`
- `GET /media/{id}/stream`
- `PUT /media/{id}/progress`
- `POST /media/upload`
- `GET /search/`
- `GET /search/tmdb`
- `GET/POST /profiles/`
- `GET /admin/stats`
- `GET /admin/users`
- `GET /admin/media`

## Notes

Uploaded files are marked ready immediately and streamed directly from Django media storage. If a media item has `hls_path`, the API returns its `/hls/.../master.m3u8` URL; otherwise it returns the uploaded file URL, and the frontend player supports both modes.
