FROM python:3.11-slim

WORKDIR /app

# System deps for sentence-transformers / torch (CPU)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Create directories
RUN mkdir -p uploads data/docs app/db

# Expose API port
EXPOSE 8000

# Non-root user for security
RUN useradd -m cerviscan && chown -R cerviscan:cerviscan /app
USER cerviscan

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
