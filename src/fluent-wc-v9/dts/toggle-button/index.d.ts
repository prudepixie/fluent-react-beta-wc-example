import { ToggleButton } from "./toggle-button";
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
