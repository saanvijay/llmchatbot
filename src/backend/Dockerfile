FROM python:3.9-slim

# Install system dependencies including FFmpeg, FLAC, and eSpeak
RUN apt-get update && apt-get install -y \
    ffmpeg \
    flac \
    espeak \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create a virtual environment (venv)
RUN python -m venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python3", "main.py"]