from fastapi import FastAPI, HTTPException
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin SDK
cred = credentials.Certificate("path/to/your/firebase/credentials.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Create FastAPI app
app = FastAPI()

@app.post("/investment_projection")
async def investment_projection():
    # Fetch input data from Firestore
    doc_ref = db.collection("investment_inputs").document("user_data")
    user_data = doc_ref.get().to_dict()

    if not user_data:
        raise HTTPException(status_code=404, detail="User data not found in Firestore.")

    # Gather user inputs from Firestore document
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

    # Update results in Firestore
    results_ref = db.collection("investment_results").document("projection")
    results_ref.set({"projections": results})

    return {"message": "Projection completed and results saved to Firestore.", "results": results}
