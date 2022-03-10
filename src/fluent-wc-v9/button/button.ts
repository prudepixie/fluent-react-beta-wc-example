import { attr } from "@microsoft/fast-element";
import {
    Button as FoundationButton
} from "@microsoft/fast-foundation";

/**
 * Types of button appearance.
 * @public
 */
export type ButtonAppearance =
    | undefined
    | "primary"
    | "subtle"
    | "outline"
    | "transparent";

/**
 * Types of button shape.
 * @public
 */
 export type ButtonShape =
    | "circular"
    | "square"
    | "rounded";

 /**
 * Types of button size.
 * @public
 */
export type ButtonSize =
    | "small"
    | "medium"
    | "large";

/**
 * @internal
 */
export class Button extends FoundationButton {
    /**
     * The appearance the button should have.
     *
     * @public
     * @remarks
     * HTML Attribute: appearance
     */
    @attr
    public appearance: ButtonAppearance;

    /**
     * The shape the button should have.
     *
     * @public
     * @remarks
     * HTML Attribute: shape
     */
     @attr
     public shape: ButtonShape = "rounded";

    /**
     * The size the button should have.
     *
     * @public
     * @remarks
     * HTML Attribute: shape
     */
    @attr
    public size: ButtonSize = "medium";

    /**
     * The button can fill its space.
     *
     * @public
     * @remarks
     * HTML Attribute: block
     */
    @attr({ mode: "boolean" })
    public block: boolean = false;

    /**
     * The appearance the button should have.
     *
     * @public
     * @remarks
     * HTML Attribute: block
     */
    @attr({ attribute: "disabledfocusable", mode: "boolean"})
    public disabledFocusable: boolean = false;

    /**
     * Applies 'icon-only' class when there is only an SVG in the default slot
     *
     * @public
     * @remarks
     */
    public defaultSlottedContentChanged(): void {
        const slottedElements = this.defaultSlottedContent.filter(
            x => x.nodeType === Node.ELEMENT_NODE
        );
        if (slottedElements.length === 1 && slottedElements[0] instanceof SVGElement) {
            this.control.classList.add("icon-only");
        } else {
            this.control.classList.remove("icon-only");
        }
    }
}