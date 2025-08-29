export function calculateTotal(amounts: string): number {
    const amountList = amounts
        .split(/[\n,]+/)
        .map(amount => amount.trim())
        .filter(amount => amount.length > 0)
        .map(amount => {
            const numericString = amount.replace(/[^\d.-]/g, '');
            const isValidNumber = /^-?\d*\.?\d+$/.test(numericString) && numericString !== '';
            return isValidNumber ? parseFloat(numericString) : NaN;
        })
        .filter(amount => !isNaN(amount));

    const totalAmount = amountList.reduce((sum, amount) => sum + amount, 0);
    return totalAmount;
}