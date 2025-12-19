# Stock Verify Application

## Quick Start Scripts

### Start Application
```bash
./start.sh
```
- Starts both backend and frontend servers in separate Terminal windows
- Automatically checks for busy ports and asks to kill them if needed
- Backend runs on port 8001
- Frontend runs on Expo ports (8081, 19000-19002, 19006)

### Stop Application
```bash
./stop.sh
```
- Stops both backend and frontend servers
- Kills all processes on related ports
- Verifies all ports are free

## Manual Start (Alternative)

### Backend
```bash
cd backend
export PYTHONPATH=..
uvicorn backend.server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend
```bash
cd frontend
npm start
```

## Port Management

If ports are busy, the `start.sh` script will:
1. Detect busy ports
2. Ask for confirmation to kill the process
3. Kill the process if confirmed
4. Start the servers

## Troubleshooting

If servers don't stop properly:
```bash
# Kill backend
lsof -ti :8001 | xargs kill -9

# Kill frontend
lsof -ti :8081,19000,19001,19002,19006 | xargs kill -9
```

# Here are your Instructions
