import { Anchor } from '@microsoft/fast-foundation';
import { Button as Button_2 } from '@microsoft/fast-foundation';
import { DesignSystem } from '@microsoft/fast-foundation';

/**
 * @internal
 */
declare class Button extends Button_2 {
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

/**
 * Types of button appearance.
 * @public
 */
declare type ButtonAppearance = undefined | "primary" | "subtle" | "outline" | "transparent";

/**
 * Types of button shape.
 * @public
 */
declare type ButtonShape = "circular" | "square" | "rounded";

/**
* Types of button size.
* @public
*/
declare type ButtonSize = "small" | "medium" | "large";

/**
 * A function that returns a Button registration for configuring the component with a DesignSystem.
 * Implements {@link @microsoft/fast-foundation#buttonTemplate}
 *
 *
 * @public
 * @remarks
 * Generates HTML Element: `<fluent-button>`
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/delegatesFocus | delegatesFocus}
 */
export declare const fluentButton: (overrideDefinition?: import("@microsoft/fast-foundation").OverrideFoundationElementDefinition<{
    baseName: string;
    baseClass: typeof Button_2;
    template: (context: any, definition: any) => import("@microsoft/fast-element").ViewTemplate<Button, any>;
    styles: (context: any, definition: any) => import("@microsoft/fast-element").ElementStyles;
    shadowOptions: {
        delegatesFocus: true;
    };
}> | undefined) => import("@microsoft/fast-foundation").FoundationElementRegistry<{
    baseName: string;
    baseClass: typeof Button_2;
    template: (context: any, definition: any) => import("@microsoft/fast-element").ViewTemplate<Button, any>;
    styles: (context: any, definition: any) => import("@microsoft/fast-element").ElementStyles;
    shadowOptions: {
        delegatesFocus: true;
    };
}, typeof Button>;

/**
 * A function that returns a Button registration for configuring the component with a DesignSystem.
 * Implements
 *
 *
 * @public
 * @remarks
 * Generates HTML Element: `<fluent-link>`
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/delegatesFocus | delegatesFocus}
 */
export declare const fluentLink: (overrideDefinition?: import("@microsoft/fast-foundation").OverrideFoundationElementDefinition<{
    baseName: string;
    template: (context: import("@microsoft/fast-foundation").ElementDefinitionContext, definition: import("@microsoft/fast-foundation").OverrideFoundationElementDefinition<import("@microsoft/fast-foundation").FoundationElementDefinition>) => import("@microsoft/fast-element").ViewTemplate<Link, any>;
    styles: (context: any, definition: any) => import("@microsoft/fast-element").ElementStyles;
    shadowOptions: {
        delegatesFocus: true;
    };
}> | undefined) => import("@microsoft/fast-foundation").FoundationElementRegistry<{
    baseName: string;
    template: (context: import("@microsoft/fast-foundation").ElementDefinitionContext, definition: import("@microsoft/fast-foundation").OverrideFoundationElementDefinition<import("@microsoft/fast-foundation").FoundationElementDefinition>) => import("@microsoft/fast-element").ViewTemplate<Link, any>;
    styles: (context: any, definition: any) => import("@microsoft/fast-element").ElementStyles;
    shadowOptions: {
        delegatesFocus: true;
    };
}, typeof Link>;

/**
 * A function that returns a Button registration for configuring the component with a DesignSystem.
 * Implements {@link @microsoft/fast-foundation#buttonTemplate}
 *
 *
 * @public
 * @remarks
 * Generates HTML Element: `<fluent-toggle-button>`
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/delegatesFocus | delegatesFocus}
 */
export declare const fluentToggleButton: (overrideDefinition?: import("@microsoft/fast-foundation").OverrideFoundationElementDefinition<{
    baseName: string;
    template: (context: any, definition: any) => import("@microsoft/fast-element").ViewTemplate<ToggleButton, any>;
    styles: (context: any, definition: any) => import("@microsoft/fast-element").ElementStyles;
    shadowOptions: {
        delegatesFocus: true;
    };
}> | undefined) => import("@microsoft/fast-foundation").FoundationElementRegistry<{
    baseName: string;
    template: (context: any, definition: any) => import("@microsoft/fast-element").ViewTemplate<ToggleButton, any>;
    styles: (context: any, definition: any) => import("@microsoft/fast-element").ElementStyles;
    shadowOptions: {
        delegatesFocus: true;
    };
}, typeof ToggleButton>;

/**
 * @internal
 */
declare class Link extends Anchor {
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

/**
 * Types of button appearance.
 * @public
 */
declare type LinkAppearance = undefined | "subtle";

/**
 * Provides a design system for the specified element either by returning one that was
 * already created for that element or creating one.
 * @param element - The element to root the design system at. By default, this is the body.
 * @returns A Fluent Design System
 * @public
 */
export declare function provideFluentDesignSystem(element?: HTMLElement): DesignSystem;

/**
 * @internal
 */
declare class ToggleButton extends Button {
    /**
     * Tracks whether the "checked" property has been changed.
     * This is necessary to provide consistent behavior with
     * normal input checkboxes
     */
    protected dirtyChecked: boolean;
    /**
     * Provides the default checkedness of the input element
     * Passed down to proxy
     *
     * @public
     * @remarks
     * HTML Attribute: checked
     */
    checkedAttribute: boolean;
    private checkedAttributeChanged;
    defaultChecked: boolean;
    defaultCheckedChanged(): void;
    /**
     * The checked state of the control.
     *
     * @public
     */
    checked: boolean;
    checkedChanged(prev: boolean | undefined, next: boolean): void;
    /**
     * The current checkedness of the element. This property serves as a mechanism
     * to set the `checked` property through both property assignment and the
     * .setAttribute() method. This is useful for setting the field's checkedness
     * in UI libraries that bind data through the .setAttribute() API
     * and don't support IDL attribute binding.
     */
    currentChecked: boolean;
    currentCheckedChanged(prev: boolean | undefined, next: boolean): void;
    constructor();
    /**
     * @internal
     */
    keypressHandler: (e: KeyboardEvent) => void;
    /**
     * @internal
     */
    clickHandler: (e: MouseEvent) => void;
}

export { }
