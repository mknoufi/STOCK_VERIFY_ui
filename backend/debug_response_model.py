from pydantic import BaseModel

from backend.api.response_models import PaginatedResponse


class Session(BaseModel):
    id: str


items = [Session(id="1")]
resp = PaginatedResponse.create(items=items, total=1, page=1, page_size=10)
print(resp.model_dump())
print(resp.model_dump_json())
