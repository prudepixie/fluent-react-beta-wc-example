import { ElementStyles } from "@microsoft/fast-element";
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
export declare function sizeBehavior(value: string, styles: ElementStyles): PropertyStyleSheetBehavior;
