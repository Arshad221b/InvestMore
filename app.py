from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict
import math
from datetime import datetime

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
    risk_profile: str = Field("Moderate", description="Investment risk profile")
    emergency_fund_months: int = Field(6, ge=0, le=24, description="Desired emergency fund in months")

    @validator('risk_profile')
    def validate_risk_profile(cls, v):
        allowed_profiles = ["Conservative", "Moderate", "Aggressive"]
        if not v or v not in allowed_profiles:
            raise ValueError(f"Risk profile must be one of: {', '.join(allowed_profiles)}")
        return v

    @validator('retirement_age')
    def validate_retirement_age(cls, v, values):
        if 'current_age' in values and v <= values['current_age']:
            raise ValueError("Retirement age must be greater than current age")
        return v

    @validator('life_expectancy')
    def validate_life_expectancy(cls, v, values):
        if 'retirement_age' in values and v <= values['retirement_age']:
            raise ValueError("Life expectancy must be greater than retirement age")
        return v

    class Config:
        anystr_strip_whitespace = True

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
    asset_allocation: dict
    emergency_fund_status: Optional[float]

class AgeMilestone(BaseModel):
    age: int
    year: int
    milestone_type: str
    description: str
    recommended_action: str
    priority: str  # 'high', 'medium', 'low'

class ProjectionResponse(BaseModel):
    message: str
    results: List[YearlyProjection]
    summary: dict
    risk_profile: str
    recommendations: List[str]
    age_milestones: List[AgeMilestone]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def read_root():
    return FileResponse("static/index.html")

app.mount("/static", StaticFiles(directory="static"), name="static")

def calculate_asset_allocation(risk_profile: str, age: int) -> dict:
    base_allocations = {
        "Conservative": {"equity": 40, "debt": 60, "gold": 0},
        "Moderate": {"equity": 60, "debt": 35, "gold": 5},
        "Aggressive": {"equity": 80, "debt": 15, "gold": 5}
    }
    
    # Age-based adjustment (reduce equity by 1% for each year over 50)
    allocation = base_allocations[risk_profile].copy()
    if age > 50:
        age_adjustment = min(20, age - 50)  # Cap the adjustment at 20%
        allocation["equity"] = max(20, allocation["equity"] - age_adjustment)
        allocation["debt"] = min(80, allocation["debt"] + age_adjustment)
    
    return allocation

def generate_recommendations(input_data: InvestmentInput, summary: dict) -> List[str]:
    recommendations = []
    
    # Investment amount recommendations
    if input_data.initial_monthly_investment < 10000:
        recommendations.append("Consider increasing your monthly investment to at least ₹10,000 for better wealth accumulation")
    
    # Risk profile recommendations
    if input_data.current_age < 30 and input_data.risk_profile == "Conservative":
        recommendations.append("Given your young age, consider a more aggressive investment strategy")
    elif input_data.current_age > 50 and input_data.risk_profile == "Aggressive":
        recommendations.append("Consider a more conservative allocation to protect your wealth")
    
    # Return rate expectations
    if input_data.return_rate > 15:
        recommendations.append("Your expected return rate might be optimistic. Consider using a more conservative estimate")
    
    # Emergency fund
    if input_data.emergency_fund_months < 6:
        recommendations.append("Build an emergency fund of at least 6 months of expenses")
    
    # Retirement gap analysis
    if input_data.desired_monthly_income and summary["final_monthly_income"] < input_data.desired_monthly_income:
        gap_percentage = ((input_data.desired_monthly_income - summary["final_monthly_income"]) / input_data.desired_monthly_income) * 100
        recommendations.append(f"There's a {gap_percentage:.1f}% gap in your desired retirement income. Consider increasing your investments")
    
    return recommendations

def generate_age_milestones(input_data: InvestmentInput) -> List[AgeMilestone]:
    current_year = datetime.now().year
    milestones = []
    
    # Early Career Phase (Current Age to 35)
    start_age = input_data.current_age
    
    milestones.extend([
        AgeMilestone(
            age=start_age,
            year=current_year,
            milestone_type="Starting Point",
            description="Beginning of investment journey",
            recommended_action="Start building emergency fund and basic investment portfolio",
            priority="high"
        ),
        AgeMilestone(
            age=min(start_age + 5, input_data.retirement_age),
            year=current_year + 5,
            milestone_type="Emergency Fund",
            description="Emergency fund milestone",
            recommended_action=f"Aim to have ₹{(input_data.initial_monthly_investment * 6):,.0f} in emergency fund",
            priority="high"
        )
    ])

    # Mid-Career Phase (35-45)
    if start_age < 45:
        milestones.append(AgeMilestone(
            age=min(40, input_data.retirement_age),
            year=current_year + (40 - start_age),
            milestone_type="Wealth Building",
            description="Peak earning and investment phase",
            recommended_action="Maximize investments and consider diversification",
            priority="medium"
        ))

    # Pre-Retirement Phase (45-Retirement)
    if start_age < input_data.retirement_age - 5:
        milestones.append(AgeMilestone(
            age=input_data.retirement_age - 5,
            year=current_year + (input_data.retirement_age - 5 - start_age),
            milestone_type="Pre-Retirement",
            description="Preparation for retirement",
            recommended_action="Start shifting to more conservative investments",
            priority="high"
        ))

    # Retirement Milestone
    milestones.append(AgeMilestone(
        age=input_data.retirement_age,
        year=current_year + (input_data.retirement_age - start_age),
        milestone_type="Retirement",
        description="Beginning of retirement phase",
        recommended_action=f"Implement withdrawal strategy of ₹{(input_data.desired_monthly_income or 0):,.0f}/month",
        priority="high"
    ))

    # Post-Retirement Milestones
    if input_data.life_expectancy > input_data.retirement_age:
        milestones.append(AgeMilestone(
            age=input_data.life_expectancy,
            year=current_year + (input_data.life_expectancy - start_age),
            milestone_type="Estate Planning",
            description="Legacy planning phase",
            recommended_action="Review and update estate planning",
            priority="medium"
        ))

    return milestones

@app.post("/investment_projection")
async def investment_projection(input_data: InvestmentInput) -> ProjectionResponse:
    if input_data.retirement_age <= input_data.current_age:
        raise HTTPException(status_code=400, detail="Retirement age must be greater than current age")
    
    if input_data.life_expectancy <= input_data.retirement_age:
        raise HTTPException(status_code=400, detail="Life expectancy must be greater than retirement age")

    results = []
    
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
        
        # Calculate asset allocation
        asset_allocation = calculate_asset_allocation(input_data.risk_profile, age)
        
        if is_retired:
            # During retirement: First calculate return, then withdraw monthly
            annual_return = current_value * (input_data.return_rate / 100)
            monthly_return = annual_return / 12
            
            # Calculate desired monthly withdrawal (adjusted for inflation)
            if input_data.desired_monthly_income:
                # Calculate inflation-adjusted desired income for the current year
                inflation_factor = math.pow(1 + input_data.inflation_rate / 100, year)
                desired_monthly_withdrawal = input_data.desired_monthly_income * inflation_factor
                
                # Calculate safe maximum withdrawal based on current portfolio value
                safe_max_withdrawal = (current_value * safe_withdrawal_rate / 12)
                
                # Start with inflation-adjusted desired withdrawal, but cap it at safe maximum
                monthly_withdrawal = min(desired_monthly_withdrawal, safe_max_withdrawal)
                
                # If portfolio can't support even 50% of desired withdrawal, show warning
                if monthly_withdrawal < (desired_monthly_withdrawal * 0.5):
                    recommendations.append(
                        f"Warning: At age {age}, portfolio can only support "
                        f"{(monthly_withdrawal/desired_monthly_withdrawal*100):.1f}% "
                        f"of your desired monthly income"
                    )
            else:
                # If no desired income specified, use safe withdrawal rate
                monthly_withdrawal = (current_value * safe_withdrawal_rate / 12)
            
            # Calculate yearly impact with monthly compounding
            yearly_withdrawals = 0
            for month in range(12):
                if current_value > 0:
                    # Add monthly return
                    current_value += monthly_return
                    # Subtract monthly withdrawal if possible
                    if current_value >= monthly_withdrawal:
                        current_value -= monthly_withdrawal
                        yearly_withdrawals += monthly_withdrawal
                    else:
                        # If not enough funds, withdraw what's left
                        yearly_withdrawals += current_value
                        current_value = 0
                        monthly_withdrawal = 0
                        break
                else:
                    monthly_withdrawal = 0
                    break
            
            total_withdrawals += yearly_withdrawals
            monthly_investment = 0  # No more investments during retirement
            annual_contribution = 0
        else:
            # During accumulation phase: Calculate returns and add contributions
            annual_return = current_value * (input_data.return_rate / 100)
            current_value += annual_return
            annual_contribution = monthly_investment * 12
            current_value += annual_contribution
            total_contributions += annual_contribution
            monthly_withdrawal = 0
            yearly_withdrawals = 0
        
        # Calculate inflation-adjusted value
        inflation_adjusted = current_value / math.pow(1 + input_data.inflation_rate / 100, year)
        
        # Calculate potential monthly income
        potential_monthly_income = monthly_withdrawal if is_retired else 0
        
        # Calculate emergency fund status
        monthly_expenses = input_data.desired_monthly_income or monthly_investment
        required_emergency_fund = monthly_expenses * input_data.emergency_fund_months
        emergency_fund_status = (current_value * 0.1) / required_emergency_fund * 100  # Assume 10% of portfolio for emergency fund
        
        # Calculate retirement gap if applicable
        retirement_gap = None
        if input_data.desired_monthly_income and is_retired:
            retirement_gap = ((input_data.desired_monthly_income - monthly_withdrawal) / input_data.desired_monthly_income) * 100
        
        results.append(YearlyProjection(
            age=age,
            investment_amount=round(current_value, 2),
            inflation_adjusted=round(inflation_adjusted, 2),
            monthly_investment=round(monthly_investment, 2),
            annual_return=round(annual_return, 2),
            potential_monthly_income=round(monthly_withdrawal, 2),
            savings_ratio=round((annual_contribution / (monthly_investment * 12)) * 100, 2) if not is_retired else None,
            retirement_gap=round(retirement_gap, 2) if retirement_gap is not None else None,
            withdrawal_rate=round((yearly_withdrawals / current_value * 100), 2) if is_retired else None,
            asset_allocation=asset_allocation,
            emergency_fund_status=round(emergency_fund_status, 2)
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
            if total_contributions > 0 else 0,
        "safe_withdrawal_rate": safe_withdrawal_rate
    }

    # Generate recommendations
    recommendations = generate_recommendations(input_data, summary)

    return ProjectionResponse(
        message="Projection completed successfully",
        results=results,
        summary=summary,
        risk_profile=input_data.risk_profile,
        recommendations=recommendations,
        age_milestones=generate_age_milestones(input_data)
    )

@app.exception_handler(ValueError)
async def validation_exception_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc)}
    )
