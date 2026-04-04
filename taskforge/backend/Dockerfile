FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

RUN chmod +x /app/start.sh

# Render sets PORT; default to 8000 for local usage.
CMD ["/app/start.sh"]
