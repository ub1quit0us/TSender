function calculateTotal(amounts: string): number {
    const amountList = amounts
        .split(/[\n,]+/)
        .map(amount => amount.trim())
        .filter(amount => amount.length > 0)
        .map(amount => parseFloat(amount));

    const totalAmount = amountList.reduce((sum, amount) => sum + amount, 0);
    return totalAmount
}