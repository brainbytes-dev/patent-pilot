FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir psycopg2-binary

COPY scripts/ .

# Default: Idle (wird per Coolify-Cron Command überschrieben)
CMD ["python3", "--version"]
