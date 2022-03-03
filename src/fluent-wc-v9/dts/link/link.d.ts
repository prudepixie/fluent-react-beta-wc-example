import { Anchor as FoundationAnchor } from "@microsoft/fast-foundation";
/**
 * Types of button appearance.
 * @public
 */
export declare type LinkAppearance = undefined | "subtle";
/**
 * @internal
 */
export declare class Link extends FoundationAnchor {
    /**
     * The appearance the button should have.
     *
     * @public
     * @remarks
     * HTML Attribute: appearance
     */
    appearance: LinkAppearance;
    /**
     * The link renders inline with text.
     *
     * @public
     * @remarks
     * HTML Attribute: inline
     */
    inline: boolean;
    /**
     * The link is disabled
     *
     * @public
     * @remarks
     * HTML Attribute: disabled
     */
    disabled: boolean;
    /**
     * The appearance the button should have.
     *
     * @public
     * @remarks
     * HTML Attribute: block
     */
    disabledFocusable: boolean;
    handleDisabledClick(e: MouseEvent): void | boolean;
    handleDisabledKeydown(e: KeyboardEvent): void | boolean;
}
