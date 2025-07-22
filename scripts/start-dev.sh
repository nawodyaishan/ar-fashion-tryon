#!/bin/bash
echo "Starting AR Fashion Try-On Development Environment..."

# Start PostgreSQL (assuming Docker)
docker-compose up -d postgres

# Start ML Backend
cd ml-backend
source venv/bin/activate
python main.py &
ML_PID=$!

# Start Web Backend
cd ../web-backend
npm run start:dev &
WEB_PID=$!

# Start Web Frontend
cd ../web-frontend
npm run dev &
FRONT_PID=$!

echo "Services started:"
echo "ML Backend: http://localhost:8000"
echo "Web Backend: http://localhost:3001"
echo "Frontend: http://localhost:3000"

# Wait for Ctrl+C
trap "kill $ML_PID $WEB_PID $FRONT_PID; exit" INT
wait
