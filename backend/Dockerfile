# Sentinel face-attendance backend.
# dlib is compiled from source, so we need cmake + a build toolchain and BLAS.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

# System dependencies for dlib and OpenCV.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        cmake \
        libopenblas-dev \
        liblapack-dev \
        libgl1 \
        libglib2.0-0 \
        libx11-6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first for layer caching (dlib build is slow).
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

# Persistent SQLite lives here; mount a Railway volume at /data to keep data.
ENV DB_PATH=/data/attendance.db
RUN mkdir -p /data

EXPOSE 8080

# One worker keeps the in-memory encoding cache and the SQLite writer consistent.
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT} --workers 1 --threads 4 --timeout 120 app:app"]
