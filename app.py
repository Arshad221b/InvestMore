from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

class InvestmentInput(BaseModel):
    initial_investment: float
    initial_monthly_investment: float
    increment: float
    current_age: int
    number_of_years: int
    return_rate: float

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_root():
    return {"message": "Investment Calculator API"}

@app.post("/investment_projection")
async def investment_projection(input_data: InvestmentInput):
    # Initialize variables
    output = input_data.initial_investment
    with_inflation = input_data.initial_investment
    monthly_investment = input_data.initial_monthly_investment
    current_age = input_data.current_age
    results = []

    # Perform calculations
    for i in range(input_data.number_of_years):
        monthly_investment += input_data.increment
        output = output * ((100 + input_data.return_rate) / 100) + (12 * monthly_investment)
        with_inflation = output * 0.94
        current_age += 1

        # Append yearly details
        results.append({
            "age": current_age,
            "investment_amount": round(output, 2),
            "inflation_adjusted": round(with_inflation, 2),
            "monthly_investment": round(monthly_investment, 2)
        })

    return {"message": "Projection completed.", "results": results}
