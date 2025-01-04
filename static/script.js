console.log('Script loaded!');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    
    const form = document.getElementById('investmentForm');
    if (!form) {
        console.error('Form not found!');
        return;
    }

    // Add input event listeners to all currency inputs
    document.querySelectorAll('.currency-input input').forEach(input => {
        input.addEventListener('input', function(e) {
            // Remove all non-digits
            let rawValue = this.value.replace(/[^0-9]/g, '');
            
            // Store raw value for calculations
            this.dataset.rawValue = rawValue;
            
            // Format with commas
            if (rawValue) {
                const formattedValue = parseInt(rawValue).toLocaleString('en-IN');
                this.value = formattedValue;
            }
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form submitted');

        // Get values and remove commas before parsing
        const formData = {
            initial_investment: parseFloat(document.getElementById('initial_investment').value.replace(/,/g, '')) || 0,
            initial_monthly_investment: parseFloat(document.getElementById('initial_monthly_investment').value.replace(/,/g, '')) || 0,
            increment: parseFloat(document.getElementById('increment').value.replace(/,/g, '')) || 0,
            return_rate: parseFloat(document.getElementById('return_rate').value) || 0,
            inflation_rate: parseFloat(document.getElementById('inflation_rate').value) || 0,
            current_age: parseInt(document.getElementById('current_age').value) || 0,
            retirement_age: parseInt(document.getElementById('retirement_age').value) || 0,
            life_expectancy: parseInt(document.getElementById('life_expectancy').value) || 85,
            tax_bracket: parseFloat(document.getElementById('tax_bracket').value) || 0,
            desired_monthly_income: parseFloat(document.getElementById('desired_monthly_income').value.replace(/,/g, '')) || 0
        };

        console.log('Sending form data:', formData);

        try {
            const response = await fetch('/investment_projection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Received data:', data);
            
            if (data.results) {
                displayResults(data.results, formData);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while calculating the projection: ' + error.message);
        }
    });
});

function displayResults(results, formData) {
    const resultsDiv = document.getElementById('results');
    const resultsTable = document.getElementById('resultsTable');
    resultsDiv.style.display = 'block';
    resultsTable.innerHTML = '';

    // Update summary cards
    document.getElementById('totalValue').textContent = formatCurrency(results[results.length - 1].investment_amount);
    document.getElementById('monthlyIncome').textContent = formatCurrency(results[results.length - 1].potential_monthly_income);
    document.getElementById('yearsToRetirement').textContent = formData.retirement_age - formData.current_age;

    results.forEach(row => {
        const isRetirementYear = row.age === formData.retirement_age;
        const isRetired = row.age >= formData.retirement_age;
        
        resultsTable.innerHTML += `
            <tr class="${isRetirementYear ? 'table-success' : ''}">
                <td>${row.age}</td>
                <td>${formatCurrency(row.investment_amount)}</td>
                <td>${formatCurrency(row.inflation_adjusted)}</td>
                <td>${isRetired ? '<span class="text-muted">₹0</span>' : formatCurrency(row.monthly_investment)}</td>
                <td>${formatCurrency(row.annual_return)}</td>
                <td>${isRetired ? 
                    `<span class="text-success">-${formatCurrency(row.potential_monthly_income)}</span>` : 
                    '<span class="text-muted">₹0</span>'
                }</td>
            </tr>
        `;
    });

    // Add an enhanced note about retirement
    const noteDiv = document.createElement('div');
    noteDiv.className = 'alert alert-info mt-3';
    noteDiv.innerHTML = `
        <strong>Note:</strong> 
        <ul>
            <li>Monthly investments stop at retirement age (${formData.retirement_age} years).</li>
            <li>Monthly withdrawals of ${formatCurrency(results.find(r => r.age === formData.retirement_age).potential_monthly_income)} 
                begin at retirement.</li>
            <li>The corpus continues to grow through investment returns while providing monthly income.</li>
            <li>Withdrawals are adjusted for inflation and taxes.</li>
        </ul>
    `;
    resultsDiv.appendChild(noteDiv);

    // Scroll to results
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

// Format number with Indian numbering system (without currency symbol)
function formatNumber(value) {
    return new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 0
    }).format(value);
}

// Add tooltips and validation as before...

// Add some basic investment strategy recommendations
function addRecommendations(results, formData) {
    const recommendationsDiv = document.createElement('div');
    recommendationsDiv.className = 'alert alert-info mt-4';
    
    let recommendations = '<h4>Investment Recommendations:</h4><ul>';
    
    if (formData.return_rate > 12) {
        recommendations += '<li>Your expected return rate is higher than the historical Nifty 50 average. Consider a more conservative estimate.</li>';
    }
    
    if (formData.initial_monthly_investment < 10000) {
        recommendations += '<li>Consider increasing your monthly investment to at least ₹10,000 to build a substantial corpus.</li>';
    }
    
    if (formData.tax_bracket > 20) {
        recommendations += '<li>Look into tax-saving investment options like ELSS, PPF, or NPS to reduce your tax burden.</li>';
    }
    
    recommendations += '</ul>';
    recommendationsDiv.innerHTML = recommendations;
    
    document.getElementById('results').appendChild(recommendationsDiv);
} 