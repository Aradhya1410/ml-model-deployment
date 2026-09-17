# --- Base image ---
# Use a small, official Python image. "slim" = fewer unnecessary OS packages,
# which means a smaller, faster, more secure image.
FROM python:3.11-slim

# --- Set the working directory inside the container ---
# All following commands run relative to /app inside the container.
WORKDIR /app

# --- Install OS-level build tools needed by some Python packages (e.g. scikit-learn) ---
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# --- Copy only requirements first (Docker layer caching trick) ---
# If requirements.txt hasn't changed, Docker reuses the cached "pip install"
# layer on rebuilds, making builds much faster.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- Now copy the rest of the application code ---
COPY app/ ./app/
COPY model/ ./model/

# --- Document which port the app listens on ---
EXPOSE 8000

# --- Basic container-level health check ---
# Docker will periodically call this to know if the container is healthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# --- Command that runs when the container starts ---
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
