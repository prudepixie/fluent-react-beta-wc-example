import { PropertyStyleSheetBehavior } from "@microsoft/fast-foundation";
/**
 * Behavior that will conditionally apply a stylesheet based on the elements
 * size property
 *
 * @param value - The value of the size property
 * @param styles - The styles to be applied when condition matches
 *
 * @public
 */
export function sizeBehavior(value, styles) {
    return new PropertyStyleSheetBehavior("size", value, styles);
}
