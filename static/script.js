console.log('Script loaded!');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    
    // Format currency inputs
    const currencyInputs = document.querySelectorAll('.currency-input input');
    currencyInputs.forEach(input => {
        input.addEventListener('input', function() {
            // Remove non-numeric characters
            let value = this.value.replace(/[^0-9]/g, '');
            // Format with commas for Indian numbering system
            if (value) {
                this.value = Number(value).toLocaleString('en-IN');
            }
        });
    });

    // Form submission handler
    const form = document.getElementById('investmentForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();
        
        // Parse currency inputs by removing commas
        const parseCurrencyValue = (id) => {
            const value = document.getElementById(id).value.replace(/,/g, '');
            return parseFloat(value) || 0;
        };

        const formData = {
            initial_investment: parseCurrencyValue('initial_investment'),
            initial_monthly_investment: parseCurrencyValue('initial_monthly_investment'),
            increment: parseCurrencyValue('increment'),
            return_rate: parseFloat(document.getElementById('return_rate').value),
            inflation_rate: parseFloat(document.getElementById('inflation_rate').value),
            current_age: parseInt(document.getElementById('current_age').value),
            retirement_age: parseInt(document.getElementById('retirement_age').value),
            life_expectancy: parseInt(document.getElementById('life_expectancy').value),
            tax_bracket: parseFloat(document.getElementById('tax_bracket').value),
            desired_monthly_income: parseCurrencyValue('desired_monthly_income'),
            risk_profile: document.getElementById('risk_profile').value,
            emergency_fund_months: parseInt(document.getElementById('emergency_fund').value)
        };

        try {
            const response = await fetch('/investment_projection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || 'Something went wrong');
            }

            displayResults(data, formData);
            createCharts(data);
            createPieChart(data);
            createSavingsProgressChart(data);
            createRetirementIncomeChart(data);
            createRiskAnalysisChart(data);
            displayRecommendations(data, formData);
        } catch (error) {
            document.getElementById('results').innerHTML = `
                <div class="alert alert-danger">
                    Error: ${error.message}
                </div>
            `;
        } finally {
            hideLoading();
        }
    });
});

function displayResults(data, formData) {
    const resultsDiv = document.getElementById('results');
    const summary = data.summary;
    
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value);
    };

    resultsDiv.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <div class="section-card">
                    <h3>Investment Summary</h3>
                    <div class="result-card">
                        <p><strong>Total Portfolio Value:</strong> ${formatCurrency(summary.total_value)}</p>
                        <p><strong>Inflation Adjusted Value:</strong> ${formatCurrency(summary.inflation_adjusted_value)}</p>
                        <p><strong>Total Contributions:</strong> ${formatCurrency(summary.total_contributions)}</p>
                        <p><strong>Total Returns:</strong> ${formatCurrency(summary.total_return)}</p>
                        <p><strong>Return on Investment:</strong> ${summary.return_on_investment.toFixed(2)}%</p>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="section-card">
                    <h3>Retirement Analysis</h3>
                    <div class="result-card">
                        <p><strong>Years to Retirement:</strong> ${summary.years_to_retirement}</p>
                        <p><strong>Retirement Year Value:</strong> ${formatCurrency(summary.retirement_year_value)}</p>
                        <p><strong>Monthly Income in Retirement:</strong> ${formatCurrency(summary.final_monthly_income)}</p>
                        <p><strong>Safe Withdrawal Rate:</strong> ${(summary.safe_withdrawal_rate * 100).toFixed(2)}%</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    displayYearlyTable(data.results);
    displayAgeMilestones(data.age_milestones);
}

function createCharts(data) {
    const config = {
        responsive: true,
        displayModeBar: false,
        // Make touch interaction better on mobile
        dragmode: false,
        // Adjust font sizes for mobile
        font: {
            size: window.innerWidth < 768 ? 10 : 12
        }
    };

    // Portfolio Growth Chart
    const years = data.results.map(r => r.age);
    const portfolioValues = data.results.map(r => r.investment_amount);
    const inflationAdjusted = data.results.map(r => r.inflation_adjusted);
    const monthlyWithdrawals = data.results.map(r => r.potential_monthly_income * 12);

    // Main portfolio growth
    const growthTrace1 = {
        x: years,
        y: portfolioValues,
        name: 'Portfolio Value',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#3498db', width: 3 }
    };

    // Inflation adjusted value
    const growthTrace2 = {
        x: years,
        y: inflationAdjusted,
        name: 'Inflation Adjusted',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#e74c3c', width: 2, dash: 'dot' }
    };

    // Annual withdrawals
    const withdrawalTrace = {
        x: years,
        y: monthlyWithdrawals,
        name: 'Annual Withdrawals',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#2ecc71', width: 2 },
        visible: 'legendonly'
    };

    const growthLayout = {
        title: 'Portfolio Growth Over Time',
        xaxis: { 
            title: 'Age',
            gridcolor: '#f0f0f0'
        },
        yaxis: { 
            title: 'Value (₹)',
            gridcolor: '#f0f0f0',
            tickformat: ',.0f'
        },
        showlegend: true,
        legend: {
            x: 0.05,
            y: 1
        },
        plot_bgcolor: '#ffffff',
        paper_bgcolor: '#ffffff',
        hovermode: 'x unified',
        height: window.innerWidth < 768 ? 300 : 400,
        margin: {
            l: 50,
            r: 30,
            t: 30,
            b: 50
        }
    };

    Plotly.newPlot('portfolioGrowthChart', [growthTrace1, growthTrace2, withdrawalTrace], 
        {...growthLayout, ...config});

    // Asset Allocation Over Time Chart
    const equityAllocation = data.results.map(r => r.asset_allocation.equity);
    const debtAllocation = data.results.map(r => r.asset_allocation.debt);
    const goldAllocation = data.results.map(r => r.asset_allocation.gold);

    const equityTrace = {
        x: years,
        y: equityAllocation,
        name: 'Equity',
        type: 'scatter',
        mode: 'lines',
        stackgroup: 'one',
        fillcolor: '#e74c3c',
        line: { color: '#e74c3c', width: 0 }
    };

    const debtTrace = {
        x: years,
        y: debtAllocation,
        name: 'Debt',
        type: 'scatter',
        mode: 'lines',
        stackgroup: 'one',
        fillcolor: '#3498db',
        line: { color: '#3498db', width: 0 }
    };

    const goldTrace = {
        x: years,
        y: goldAllocation,
        name: 'Gold',
        type: 'scatter',
        mode: 'lines',
        stackgroup: 'one',
        fillcolor: '#f1c40f',
        line: { color: '#f1c40f', width: 0 }
    };

    const allocationLayout = {
        title: 'Asset Allocation Over Time',
        xaxis: { 
            title: 'Age',
            gridcolor: '#f0f0f0'
        },
        yaxis: { 
            title: 'Allocation (%)',
            gridcolor: '#f0f0f0',
            range: [0, 100]
        },
        showlegend: true,
        legend: {
            x: 0.05,
            y: 1
        },
        plot_bgcolor: '#ffffff',
        paper_bgcolor: '#ffffff',
        hovermode: 'x unified'
    };

    Plotly.newPlot('assetAllocationChart', [equityTrace, debtTrace, goldTrace], allocationLayout);

    // Add Portfolio Metrics Chart
    const retirementAge = data.results.find(r => r.potential_monthly_income > 0)?.age;
    const preRetirementData = data.results.filter(r => r.age < retirementAge);
    const postRetirementData = data.results.filter(r => r.age >= retirementAge);

    const annualReturnsTrace = {
        x: years,
        y: data.results.map(r => (r.annual_return / r.investment_amount * 100)),
        name: 'Annual Return Rate',
        type: 'scatter',
        mode: 'lines',
        yaxis: 'y2',
        line: { color: '#9b59b6', width: 2 }
    };

    const withdrawalRateTrace = {
        x: postRetirementData.map(r => r.age),
        y: postRetirementData.map(r => r.withdrawal_rate),
        name: 'Withdrawal Rate',
        type: 'scatter',
        mode: 'lines',
        yaxis: 'y2',
        line: { color: '#e67e22', width: 2 }
    };

    const metricsLayout = {
        title: 'Portfolio Metrics',
        xaxis: { 
            title: 'Age',
            gridcolor: '#f0f0f0'
        },
        yaxis: { 
            title: 'Value',
            gridcolor: '#f0f0f0',
            tickformat: ',.1f'
        },
        yaxis2: {
            title: 'Rate (%)',
            overlaying: 'y',
            side: 'right',
            gridcolor: '#f0f0f0'
        },
        showlegend: true,
        legend: {
            x: 0.05,
            y: 1
        },
        plot_bgcolor: '#ffffff',
        paper_bgcolor: '#ffffff',
        hovermode: 'x unified'
    };

    // Create a new div for the metrics chart
    if (!document.getElementById('portfolioMetricsChart')) {
        const metricsDiv = document.createElement('div');
        metricsDiv.id = 'portfolioMetricsChart';
        document.getElementById('charts').appendChild(metricsDiv);
    }

    Plotly.newPlot('portfolioMetricsChart', [annualReturnsTrace, withdrawalRateTrace], metricsLayout);
}

function createPieChart(data) {
    // Get the latest year's allocation
    const latestAllocation = data.results[data.results.length - 1].asset_allocation;
    
    const pieData = [{
        values: [
            latestAllocation.equity,
            latestAllocation.debt,
            latestAllocation.gold
        ],
        labels: ['Equity', 'Debt', 'Gold'],
        type: 'pie',
        hole: 0.4,
        marker: {
            colors: ['#e74c3c', '#3498db', '#f1c40f']
        },
        textinfo: 'label+percent',
        textposition: 'outside',
        automargin: true
    }];

    const pieLayout = {
        title: 'Current Asset Allocation',
        height: 400,
        showlegend: true,
        legend: {
            orientation: 'h',
            y: -0.1
        },
        annotations: [{
            text: 'Asset<br>Split',
            showarrow: false,
            font: {
                size: 14
            }
        }]
    };

    // Create a new div for the pie chart if it doesn't exist
    if (!document.getElementById('assetPieChart')) {
        const pieDiv = document.createElement('div');
        pieDiv.id = 'assetPieChart';
        document.querySelector('#charts .row').insertAdjacentElement('beforeend', 
            document.createElement('div').className = 'col-md-6').appendChild(pieDiv);
    }

    Plotly.newPlot('assetPieChart', pieData, pieLayout, {
        responsive: true,
        displayModeBar: false
    });
}

function displayRecommendations(data, formData) {
    const recommendations = [];
    const summary = data.summary;

    // Check if monthly investment is sufficient
    const monthlyIncome = formData.desired_monthly_income;
    if (summary.final_monthly_income < monthlyIncome) {
        recommendations.push(`Consider increasing your monthly investment to reach your desired retirement income of ₹${monthlyIncome.toLocaleString('en-IN')}`);
    }

    // Risk profile recommendations
    if (formData.current_age < 30 && formData.risk_profile === 'conservative') {
        recommendations.push('Given your young age, you might consider a more aggressive investment strategy to maximize long-term returns');
    }

    // Emergency fund recommendations
    if (formData.emergency_fund_months < 6) {
        recommendations.push('Consider building an emergency fund of at least 6 months of expenses');
    }

    // Display recommendations if any
    if (recommendations.length > 0) {
        const recommendationsHtml = recommendations
            .map(rec => `<li>${rec}</li>`)
            .join('');
            
        document.getElementById('results').insertAdjacentHTML(
            'beforeend',
            `<div class="section-card mt-4">
                <h3>Recommendations</h3>
                <ul class="recommendations-list">
                    ${recommendationsHtml}
                </ul>
            </div>`
        );
    }
}

function displayAgeMilestones(milestones) {
    const resultsDiv = document.getElementById('results');
    
    const priorityColors = {
        high: 'table-danger',
        medium: 'table-warning',
        low: 'table-info'
    };

    const milestonesHtml = `
        <div class="section-card mt-4">
            <h3>Age-wise Investment Milestones</h3>
            <div class="table-responsive">
                <table class="table table-bordered">
                    <thead class="table-light">
                        <tr>
                            <th>Age</th>
                            <th>Year</th>
                            <th>Milestone</th>
                            <th>Description</th>
                            <th>Recommended Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${milestones.map(milestone => `
                            <tr class="${priorityColors[milestone.priority]}">
                                <td>${milestone.age}</td>
                                <td>${milestone.year}</td>
                                <td>${milestone.milestone_type}</td>
                                <td>${milestone.description}</td>
                                <td>${milestone.recommended_action}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    resultsDiv.insertAdjacentHTML('beforeend', milestonesHtml);
}

function displayYearlyTable(results) {
    const resultsDiv = document.getElementById('results');
    
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value);
    };

    const yearlyTableHtml = `
        <div class="section-card mt-4">
            <h3>Year-by-Year Projection</h3>
            <div class="table-responsive">
                <table class="table table-bordered table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Age</th>
                            <th>Year</th>
                            <th>Portfolio Value</th>
                            <th>Monthly Investment</th>
                            <th>Annual Return</th>
                            <th>Monthly Withdrawal</th>
                            <th>Inflation Adjusted Value</th>
                            <th class="d-none d-md-table-cell">Asset Allocation</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results.map(year => `
                            <tr class="${year.potential_monthly_income > 0 ? 'table-warning' : ''}">
                                <td>${year.age}</td>
                                <td>${new Date().getFullYear() + (year.age - results[0].age)}</td>
                                <td>${formatCurrency(year.investment_amount)}</td>
                                <td>${year.monthly_investment > 0 ? formatCurrency(year.monthly_investment) : '-'}</td>
                                <td>${formatCurrency(year.annual_return)}</td>
                                <td>${year.potential_monthly_income > 0 ? formatCurrency(year.potential_monthly_income) : '-'}</td>
                                <td>${formatCurrency(year.inflation_adjusted)}</td>
                                <td class="d-none d-md-table-cell">
                                    <small>
                                        Equity: ${year.asset_allocation.equity}% | 
                                        Debt: ${year.asset_allocation.debt}% | 
                                        Gold: ${year.asset_allocation.gold}%
                                    </small>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    resultsDiv.insertAdjacentHTML('beforeend', yearlyTableHtml);
}

// Add loading state
function showLoading() {
    document.body.classList.add('loading');
}

function hideLoading() {
    document.body.classList.remove('loading');
}

// Add smooth scrolling to results
function scrollToResults() {
    document.getElementById('results').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

// Add touch event handling for better mobile interaction
document.addEventListener('touchstart', function() {}, {passive: true});

// Prevent zoom on double tap
let lastTouchEnd = 0;
document.addEventListener('touchend', function(event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

function createSavingsProgressChart(data) {
    const totalContributions = data.results.map(r => r.monthly_investment * 12);
    const returns = data.results.map((r, i) => r.annual_return);
    const cumulative = data.results.map(r => r.investment_amount);
    const years = data.results.map(r => r.age);

    const contributionsTrace = {
        x: years,
        y: totalContributions,
        name: 'Annual Contributions',
        type: 'bar',
        marker: { color: '#2ecc71' }
    };

    const returnsTrace = {
        x: years,
        y: returns,
        name: 'Investment Returns',
        type: 'bar',
        marker: { color: '#3498db' }
    };

    const cumulativeTrace = {
        x: years,
        y: cumulative,
        name: 'Total Portfolio',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#e74c3c', width: 3 },
        yaxis: 'y2'
    };

    const layout = {
        title: 'Savings Progress & Returns',
        barmode: 'stack',
        xaxis: { title: 'Age' },
        yaxis: { 
            title: 'Annual Amount (₹)',
            tickformat: ',.0f'
        },
        yaxis2: {
            title: 'Total Portfolio Value (₹)',
            overlaying: 'y',
            side: 'right',
            tickformat: ',.0f'
        },
        showlegend: true,
        legend: { x: 0.05, y: 1.1 }
    };

    Plotly.newPlot('savingsProgressChart', 
        [contributionsTrace, returnsTrace, cumulativeTrace], 
        layout);
}

function createRetirementIncomeChart(data) {
    const retirementData = data.results.filter(r => r.potential_monthly_income > 0);
    
    const incomeTrace = {
        x: retirementData.map(r => r.age),
        y: retirementData.map(r => r.potential_monthly_income),
        name: 'Monthly Income',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#2ecc71' }
    };

    const inflationAdjustedIncome = {
        x: retirementData.map(r => r.age),
        y: retirementData.map(r => r.potential_monthly_income / 
            Math.pow(1 + data.inflation_rate/100, r.age - data.retirement_age)),
        name: 'Inflation Adjusted Income',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#e74c3c', dash: 'dot' }
    };

    const layout = {
        title: 'Retirement Income Analysis',
        xaxis: { title: 'Age' },
        yaxis: { 
            title: 'Monthly Income (₹)',
            tickformat: ',.0f'
        },
        showlegend: true
    };

    Plotly.newPlot('retirementIncomeChart', 
        [incomeTrace, inflationAdjustedIncome], 
        layout);
}

function createRiskAnalysisChart(data) {
    const years = data.results.map(r => r.age);
    const portfolioValue = data.results.map(r => r.investment_amount);
    
    // Calculate different scenario returns
    const conservativeReturn = portfolioValue.map(v => v * 0.8);  // 20% lower
    const aggressiveReturn = portfolioValue.map(v => v * 1.2);    // 20% higher

    const traces = [
        {
            x: years,
            y: aggressiveReturn,
            name: 'Optimistic Scenario',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#2ecc71', width: 1 }
        },
        {
            x: years,
            y: portfolioValue,
            name: 'Expected Scenario',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#3498db', width: 2 }
        },
        {
            x: years,
            y: conservativeReturn,
            name: 'Conservative Scenario',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#e74c3c', width: 1 }
        }
    ];

    const layout = {
        title: 'Investment Scenarios Analysis',
        xaxis: { title: 'Age' },
        yaxis: { 
            title: 'Portfolio Value (₹)',
            tickformat: ',.0f'
        },
        showlegend: true,
        legend: { x: 0.05, y: 1 }
    };

    Plotly.newPlot('scenariosChart', traces, layout);
}