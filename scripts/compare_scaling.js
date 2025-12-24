
function runComparison() {
    const baseRate = 10;
    const level = 5;
    const levelMult = level * Math.pow(1.15, level); // ~10.05
    
    console.log(`Comparison for Level ${level} Building (Multiplier: ${levelMult.toFixed(2)})`);
    console.log('Workers | Linear (Current) | Diminishing (^0.9) | Diff');
    console.log('--------|------------------|--------------------|-----');

    for (let w = 1; w <= 15; w++) {
        const linear = (baseRate * w) * levelMult;
        const diminishing = (baseRate * levelMult) * Math.pow(w, 0.9);
        const diff = diminishing - linear;
        console.log(`${w.toString().padEnd(7)} | ${linear.toFixed(1).padEnd(16)} | ${diminishing.toFixed(1).padEnd(18)} | ${diff.toFixed(1)}`);
    }
}

runComparison();
