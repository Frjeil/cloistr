from pydantic import BaseModel


class ContactPayload(BaseModel):
    name: str
    email: str
    message: str
