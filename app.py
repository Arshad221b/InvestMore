from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional
import math

class InvestmentInput(BaseModel):
    initial_investment: float = Field(..., gt=0, description="Initial investment amount in ₹")
    initial_monthly_investment: float = Field(..., ge=0, description="Initial monthly investment amount in ₹")
    increment: float = Field(..., ge=0, description="Yearly increase in monthly investment in ₹")
    return_rate: float = Field(12.0, ge=-100, le=100, description="Expected annual return rate (Nifty 50 average ~12%)")
    inflation_rate: float = Field(6.0, ge=0, le=20, description="Expected inflation rate (India avg ~6%)")
    current_age: int = Field(..., ge=0, le=100, description="Current age")
    retirement_age: int = Field(..., ge=0, le=100, description="Target retirement age")
    life_expectancy: int = Field(75, ge=0, le=120, description="Life expectancy (India avg ~75)")
    tax_bracket: float = Field(30.0, ge=0, le=100, description="Expected tax bracket in retirement")
    desired_monthly_income: Optional[float] = Field(None, ge=0, description="Desired monthly income in retirement (₹)")

class YearlyProjection(BaseModel):
    age: int
    investment_amount: float
    inflation_adjusted: float
    monthly_investment: float
    annual_return: float
    potential_monthly_income: float
    savings_ratio: Optional[float]
    retirement_gap: Optional[float]
    withdrawal_rate: Optional[float]

class ProjectionResponse(BaseModel):
    message: str
    results: list[YearlyProjection]
    summary: dict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_root():
    return {"message": "Investment Calculator API"}

@app.post("/investment_projection")
async def investment_projection(input_data: InvestmentInput) -> ProjectionResponse:
    if input_data.retirement_age <= input_data.current_age:
        raise HTTPException(status_code=400, detail="Retirement age must be greater than current age")
    
    if input_data.life_expectancy <= input_data.retirement_age:
        raise HTTPException(status_code=400, detail="Life expectancy must be greater than retirement age")

    results = []
    summary = {}
    
    # Initialize variables
    current_value = input_data.initial_investment
    monthly_investment = input_data.initial_monthly_investment
    years_to_project = input_data.life_expectancy - input_data.current_age
    total_contributions = input_data.initial_investment
    total_withdrawals = 0
    
    # Calculate safe withdrawal rate (4% rule adjusted for inflation and taxes)
    safe_withdrawal_rate = 0.04 * (1 - input_data.tax_bracket / 100)
    
    for year in range(years_to_project):
        age = input_data.current_age + year
        is_retired = age >= input_data.retirement_age
        
        # Calculate annual return (before withdrawals)
        annual_return = current_value * (input_data.return_rate / 100)
        
        # Calculate monthly income and annual withdrawals if retired
        monthly_withdrawal = 0
        if is_retired:
            monthly_withdrawal = (current_value * safe_withdrawal_rate / 12)
            annual_withdrawals = monthly_withdrawal * 12
            total_withdrawals += annual_withdrawals
            # Deduct withdrawals from current value
            current_value -= annual_withdrawals
        
        # Calculate contributions
        annual_contribution = 0 if is_retired else monthly_investment * 12
        total_contributions += annual_contribution
        
        # Update current value (after returns and contributions)
        current_value = current_value + annual_return + annual_contribution
        
        # Calculate inflation-adjusted value
        inflation_adjusted = current_value / math.pow(1 + input_data.inflation_rate / 100, year)
        
        # Calculate potential monthly income (what could be withdrawn safely)
        potential_monthly_income = (current_value * safe_withdrawal_rate / 12) if is_retired else 0
        
        results.append(YearlyProjection(
            age=age,
            investment_amount=round(current_value, 2),
            inflation_adjusted=round(inflation_adjusted, 2),
            monthly_investment=round(monthly_investment, 2),
            annual_return=round(annual_return, 2),
            potential_monthly_income=round(monthly_withdrawal, 2),
            savings_ratio=None,
            retirement_gap=None,
            withdrawal_rate=round((monthly_withdrawal * 12 / current_value * 100), 2) if is_retired else None
        ))
        
        # Increase monthly investment by yearly increment if not retired
        if not is_retired:
            monthly_investment += input_data.increment
    
    # Calculate summary statistics
    final_year = results[-1]
    retirement_year = next(r for r in results if r.age == input_data.retirement_age)
    
    summary = {
        "total_value": final_year.investment_amount,
        "inflation_adjusted_value": final_year.inflation_adjusted,
        "total_contributions": total_contributions,
        "total_withdrawals": total_withdrawals,
        "total_return": final_year.investment_amount - total_contributions + total_withdrawals,
        "years_to_retirement": input_data.retirement_age - input_data.current_age,
        "retirement_year_value": retirement_year.investment_amount,
        "final_monthly_income": final_year.potential_monthly_income,
        "return_on_investment": ((final_year.investment_amount - total_contributions + total_withdrawals) / total_contributions * 100) 
            if total_contributions > 0 else 0
    }

    return ProjectionResponse(
        message="Projection completed successfully",
        results=results,
        summary=summary
    )
