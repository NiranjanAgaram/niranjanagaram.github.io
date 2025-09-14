// Simple color test script
// Tests if blue theme colors are properly applied

// Color validation function
function validateBlueTheme() {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    const expectedColors = {
        '--primary': '#3b82f6',
        '--secondary': '#06b6d4', 
        '--accent': '#10b981'
    };
    
    let passed = 0;
    let total = Object.keys(expectedColors).length;
    
    for (const [variable, expected] of Object.entries(expectedColors)) {
        const actual = computedStyle.getPropertyValue(variable).trim();
        if (actual === expected) {
            passed++;
            console.log(`✅ ${variable}: ${expected}`);
        } else {
            console.log(`❌ ${variable}: Expected ${expected}, got ${actual}`);
        }
    }
    
    console.log(`Blue theme validation: ${passed}/${total} colors correct`);
    return passed === total;
}

// Run validation when DOM is ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', validateBlueTheme);
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { validateBlueTheme };
}