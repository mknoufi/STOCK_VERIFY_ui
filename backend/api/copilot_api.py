from copilotkit import CopilotKitSDK
from copilotkit.integrations.fastapi import add_fastapi_endpoint
from fastapi import APIRouter

# Initialize Router
router = APIRouter()

# Initialize SDK
# Note: You can add agents here later, e.g., agents=[my_langgraph_agent]
sdk = CopilotKitSDK(agents=[], commands={})

# Mount the SDK to the router
# The endpoint defaults to /copilotkit, but since we mount this router with a prefix in server.py,
# we need to be careful.
# If we mount router at /api/copilotkit, then add_fastapi_endpoint should likely be at root of this router.
add_fastapi_endpoint(router, sdk, "/")
