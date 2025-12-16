/**
 * Represents a quantity of a specific resource.
 */
export class ResourceStack {
    /**
     * @param {string} resourceType - From ResourceEnum
     * @param {number} amount - Quantity
     */
    constructor(resourceType, amount = 0) {
        this.resourceType = resourceType;
        this.amount = amount;
    }

    add(amount) {
        this.amount += amount;
    }

    remove(amount) {
        this.amount = Math.max(0, this.amount - amount);
    }
}
