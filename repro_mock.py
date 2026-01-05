
import asyncio
from unittest.mock import MagicMock, AsyncMock

async def run():
    mock_db = MagicMock()
    mock_db.sessions = MagicMock()
    
    cursor = MagicMock()
    cursor.sort = MagicMock(return_value=cursor)
    cursor.to_list = AsyncMock(return_value=[])
    mock_db.sessions.find = MagicMock(return_value=cursor)
    
    # Simulate the code
    sessions_cursor = mock_db.sessions.find({}).sort("started_at", -1)
    print(f"Cursor type: {type(sessions_cursor)}")
    print(f"to_list type: {type(sessions_cursor.to_list)}")
    
    sessions = await sessions_cursor.to_list(length=100)
    print("Success")

if __name__ == "__main__":
    asyncio.run(run())
