from sqlalchemy import Column, Integer, String, Float
from database import Base

class Trail(Base):
    __tablename__ = "user_trails"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String, nullable=False)
    region     = Column(String)
    difficulty = Column(String)  # easy / medium / hard
    duration   = Column(Float)   # in hours
    lat        = Column(Float)
    lon        = Column(Float)
    description= Column(String)
    source     = Column(String, default="user")  # "user" or "waymarked"
    status     = Column(String, default="pending")  # pending / approved / rejected
    submitted_by = Column(String)  # name or email of submitter
