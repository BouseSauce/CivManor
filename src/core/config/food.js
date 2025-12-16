import { ResourceEnum } from '../constants/enums.js';

/**
 * Sustenance values for food types.
 * Represents how much "Food Value" 1 unit of the resource provides.
 */
export const FOOD_SUSTENANCE_VALUES = {
    [ResourceEnum.Berries]: 1,
    [ResourceEnum.Fish]: 1.5,
    [ResourceEnum.Meat]: 2,
    [ResourceEnum.Bread]: 4,
};
