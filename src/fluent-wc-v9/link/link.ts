import { attr } from "@microsoft/fast-element";
import {
    Anchor as FoundationAnchor
} from "@microsoft/fast-foundation";

/**
 * Types of button appearance.
 * @public
 */
export type LinkAppearance =
    | undefined
    | "subtle";

/**
 * @internal
 */
export class Link extends FoundationAnchor {
    /**
     * The appearance the button should have.
     *
     * @public
     * @remarks
     * HTML Attribute: appearance
     */
    @attr
    public appearance: LinkAppearance;

    /**
     * The link renders inline with text.
     *
     * @public
     * @remarks
     * HTML Attribute: inline
     */
    @attr({ mode: "boolean" })
    public inline: boolean = false;

    /**
     * The link is disabled
     *
     * @public
     * @remarks
     * HTML Attribute: disabled
     */
     @attr({ mode: "boolean" })
     public disabled: boolean = false;

    /**
     * The appearance the button should have.
     *
     * @public
     * @remarks
     * HTML Attribute: block
     */
    @attr({ attribute: "disabledfocusable", mode: "boolean"})
    public disabledFocusable: boolean = false;

    public handleDisabledClick(e: MouseEvent): void | boolean {
        if (this.disabled || this.disabledFocusable) {
            e.preventDefault();
        } else {
            return true;
        }
    }

    public handleDisabledKeydown(e: KeyboardEvent): void | boolean {
        if ((this.disabled || this.disabledFocusable) && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            e.stopPropagation();
        } else {
            return true;
        }
    }
}