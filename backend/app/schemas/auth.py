from pydantic import BaseModel


class LoginPayload(BaseModel):
    login: str
    password: str


class RegisterPayload(BaseModel):
    username: str
    email: str
    password1: str
    password2: str


class PasswordResetPayload(BaseModel):
    email: str


class PasswordResetConfirmPayload(BaseModel):
    uid: str
    token: str
    new_password1: str
    new_password2: str


class PasswordChangePayload(BaseModel):
    old_password: str
    new_password1: str
    new_password2: str
