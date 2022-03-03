import { Button as FoundationButton } from "@microsoft/fast-foundation";
import { Button } from "./button";
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
    baseClass: typeof FoundationButton;
    template: (context: any, definition: any) => import("@microsoft/fast-element").ViewTemplate<Button, any>;
    styles: (context: any, definition: any) => import("@microsoft/fast-element").ElementStyles;
    shadowOptions: {
        delegatesFocus: true;
    };
}> | undefined) => import("@microsoft/fast-foundation").FoundationElementRegistry<{
    baseName: string;
    baseClass: typeof FoundationButton;
    template: (context: any, definition: any) => import("@microsoft/fast-element").ViewTemplate<Button, any>;
    styles: (context: any, definition: any) => import("@microsoft/fast-element").ElementStyles;
    shadowOptions: {
        delegatesFocus: true;
    };
}, typeof Button>;
