from fastapi import FastAPI, HTTPException

# Create FastAPI app
app = FastAPI()

@app.post("/investment_projection")
async def investment_projection():
    # Sample user data (You can replace this with data from another source like a database)
    user_data = {
        "initial_investment": 1000,
        "initial_monthly_investment": 100,
        "increment": 50,
        "current_age": 30,
        "number_of_years": 20,
        "return_rate": 7
    }

    if not user_data:
        raise HTTPException(status_code=404, detail="User data not found.")

    # Gather user inputs
    initial_investment = float(user_data.get("initial_investment", 0))
    initial_monthly_investment = float(user_data.get("initial_monthly_investment", 0))
    increment = float(user_data.get("increment", 0))
    current_age = int(user_data.get("current_age", 0))
    number_of_years = int(user_data.get("number_of_years", 0))
    return_rate = float(user_data.get("return_rate", 0))

    # Initialize variables
    output = initial_investment
    with_inflation = initial_investment
    results = []

    # Perform calculations
    for i in range(number_of_years):
        initial_monthly_investment += increment
        output = output * ((100 + return_rate) / 100) + (12 * initial_monthly_investment)
        with_inflation = output * 0.94
        current_age += 1

        # Append yearly details
        results.append({
            "age": current_age,
            "investment_amount": output,
            "inflation_adjusted": with_inflation,
            "monthly_investment": initial_monthly_investment
        })

    return {"message": "Projection completed.", "results": results}
