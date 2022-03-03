import { Button as FoundationButton } from "@microsoft/fast-foundation";
/**
 * Types of button appearance.
 * @public
 */
export declare type ButtonAppearance = undefined | "primary" | "subtle" | "outline" | "transparent";
/**
 * Types of button shape.
 * @public
 */
export declare type ButtonShape = "circular" | "square" | "rounded";
/**
* Types of button size.
* @public
*/
export declare type ButtonSize = "small" | "medium" | "large";
/**
 * @internal
 */
export declare class Button extends FoundationButton {
    /**
     * The appearance the button should have.
     *
     * @public
     * @remarks
     * HTML Attribute: appearance
     */
    appearance: ButtonAppearance;
    /**
     * The shape the button should have.
     *
     * @public
     * @remarks
     * HTML Attribute: shape
     */
    shape: ButtonShape;
    /**
     * The size the button should have.
     *
     * @public
     * @remarks
     * HTML Attribute: shape
     */
    size: ButtonSize;
    /**
     * The button can fill its space.
     *
     * @public
     * @remarks
     * HTML Attribute: block
     */
    block: boolean;
    /**
     * The appearance the button should have.
     *
     * @public
     * @remarks
     * HTML Attribute: block
     */
    disabledFocusable: boolean;
    /**
     * Applies 'icon-only' class when there is only an SVG in the default slot
     *
     * @public
     * @remarks
     */
    defaultSlottedContentChanged(): void;
}
