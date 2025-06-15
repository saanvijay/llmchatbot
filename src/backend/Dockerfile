FROM python:3.9-slim

WORKDIR /app

# Create a virtual environment (venv)
RUN python -m venv /opt/venv

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python3", "main.py"]