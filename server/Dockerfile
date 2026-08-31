FROM python:3.12-slim

  WORKDIR /app

  RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

  COPY server/requirements.txt .
  RUN pip install --no-cache-dir -r requirements.txt

  COPY server/app ./app

  ENV PYTHONUNBUFFERED=1
  EXPOSE 8000

  HEALTHCHECK --interval=30s --timeout=5s --retries=3     CMD curl -fsS http://127.0.0.1:8000/api/health || exit 1

  CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
