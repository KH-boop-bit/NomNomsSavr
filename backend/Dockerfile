FROM python:3.13-slim

# Skip the pyc files by not writing bytecode to save memory, and log outputs
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set container as app (backend)
WORKDIR /app

COPY requirements.txt .

# Install requirements (gcc C compiler for python packages, libsqlclient => mysqlclient compiler)
RUN apt-get update && apt-get install -y gcc default-libmysqlclient-dev pkg-config \
    # Remove local cache of package metadata to make image smaller    
    && rm -rf /var/lib/apt/lists/* \
    && pip install --upgrade pip && pip install -r requirements.txt

# Copy over everything in directory (backend)
COPY . /app

# Run app (gunicorn uvicorn worker for asgi for prod server, and bind networks to port=8000)
CMD ["gunicorn", "config.asgi:application", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"] 