console.log('Script loaded!'); // This should show up when the page loads

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    
    const form = document.getElementById('investmentForm');
    if (!form) {
        console.error('Form not found!');
        return;
    }

    console.log('Form found:', form);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Button clicked!');

        const formData = {
            initial_investment: parseFloat(document.getElementById('initial_investment').value),
            initial_monthly_investment: parseFloat(document.getElementById('initial_monthly_investment').value),
            increment: parseFloat(document.getElementById('increment').value),
            current_age: parseInt(document.getElementById('current_age').value),
            number_of_years: parseInt(document.getElementById('number_of_years').value),
            return_rate: parseFloat(document.getElementById('return_rate').value)
        };

        console.log('Sending data:', formData);

        try {
            const response = await fetch('/investment_projection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            console.log('Received data:', data);
            
            if (data.results) {
                const resultsDiv = document.getElementById('results');
                const resultsTable = document.getElementById('resultsTable');
                resultsDiv.style.display = 'block';
                resultsTable.innerHTML = '';

                data.results.forEach(row => {
                    resultsTable.innerHTML += `
                        <tr>
                            <td>${row.age}</td>
                            <td>${formatCurrency(row.investment_amount)}</td>
                            <td>${formatCurrency(row.inflation_adjusted)}</td>
                            <td>${formatCurrency(row.monthly_investment)}</td>
                        </tr>
                    `;
                });
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while calculating the projection: ' + error.message);
        }
    });
});

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
} 