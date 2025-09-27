from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

from database import get_db, engine, create_tables
from models import Base
from routers import auth, transactions, accounts, budgets, quiver, market_research, bank_integration
from api_routes import router as api_router

# Load environment variables
load_dotenv()

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Ezana Finance API",
    description="A comprehensive finance management API",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files from the app directory
try:
    app.mount("/static", StaticFiles(directory="../app/dist"), name="static")
    app.mount("/pages", StaticFiles(directory="../app/pages"), name="pages")
    app.mount("/css", StaticFiles(directory="../app"), name="css")
    app.mount("/js", StaticFiles(directory="../app"), name="js")
except Exception as e:
    print(f"Warning: Could not mount static files: {e}")
    pass

# Security
security = HTTPBearer()

# Include routers
app.include_router(api_router, prefix="/api", tags=["user_management"])
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["accounts"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])
app.include_router(budgets.router, prefix="/api/budgets", tags=["budgets"])
app.include_router(quiver.router, prefix="/api/quiver", tags=["quiver"])
app.include_router(market_research.router, prefix="/MarketResearch/API", tags=["market_research"])
app.include_router(bank_integration.router, prefix="/api/bank", tags=["bank_integration"])

# Serve the main HTML file
@app.get("/", response_class=HTMLResponse)
async def serve_main_page():
    try:
        with open("../app/index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return {"message": "Welcome to Ezana Finance API - Frontend not found"}

@app.get("/api")
async def api_root():
    return {"message": "Welcome to Ezana Finance API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
