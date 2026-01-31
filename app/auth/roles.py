from enum import Enum


class Role(str, Enum):
    ADMIN = "ADMIN"
    LANDLORD = "LANDLORD"
