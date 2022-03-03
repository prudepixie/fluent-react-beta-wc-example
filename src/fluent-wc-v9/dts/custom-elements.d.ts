import { Container } from "@microsoft/fast-foundation";
import { fluentButton } from "./button/index";
import { fluentLink } from "./link/index";
import { fluentToggleButton } from "./toggle-button/index";
export { fluentButton, fluentLink, fluentToggleButton };
/**
 * All Web Components
 * @public
 * @remarks
 * This object can be passed directly to the Design System's `register` method to
 * statically link and register all available components.
 */
export declare const allComponents: {
    fluentButton: (overrideDefinition?: import("@microsoft/fast-foundation").OverrideFoundationElementDefinition<{
        baseName: string;
        baseClass: typeof import("@microsoft/fast-foundation").Button;
        template: (context: any, definition: any) => import("@microsoft/fast-element").ViewTemplate<import("./button/button").Button, any>;
        styles: (context: any, definition: any) => import("@microsoft/fast-element").ElementStyles;
        shadowOptions: {
            delegatesFocus: true;
        };
    }> | undefined) => import("@microsoft/fast-foundation").FoundationElementRegistry<{
        baseName: string;
        baseClass: typeof import("@microsoft/fast-foundation").Button;
        template: (context: any, definition: any) => import("@microsoft/fast-element").ViewTemplate<import("./button/button").Button, any>;
        styles: (context: any, definition: any) => import("@microsoft/fast-element").ElementStyles;
        shadowOptions: {
            delegatesFocus: true;
        };
    }, typeof import("./button/button").Button>;
    fluentLink: (overrideDefinition?: import("@microsoft/fast-foundation").OverrideFoundationElementDefinition<{
        baseName: string;
        template: (context: import("@microsoft/fast-foundation").ElementDefinitionContext, definition: import("@microsoft/fast-foundation").OverrideFoundationElementDefinition<import("@microsoft/fast-foundation").FoundationElementDefinition>) => import("@microsoft/fast-element").ViewTemplate<import("./link/link").Link, any>;
        styles: (context: any, definition: any) => import("@microsoft/fast-element").ElementStyles;
        shadowOptions: {
            delegatesFocus: true;
        };
    }> | undefined) => import("@microsoft/fast-foundation").FoundationElementRegistry<{
        baseName: string;
        template: (context: import("@microsoft/fast-foundation").ElementDefinitionContext, definition: import("@microsoft/fast-foundation").OverrideFoundationElementDefinition<import("@microsoft/fast-foundation").FoundationElementDefinition>) => import("@microsoft/fast-element").ViewTemplate<import("./link/link").Link, any>;
        styles: (context: any, definition: any) => import("@microsoft/fast-element").ElementStyles;
        shadowOptions: {
            delegatesFocus: true;
        };
    }, typeof import("./link/link").Link>;
    fluentToggleButton: (overrideDefinition?: import("@microsoft/fast-foundation").OverrideFoundationElementDefinition<{
        baseName: string;
        template: (context: any, definition: any) => import("@microsoft/fast-element").ViewTemplate<import("./toggle-button/toggle-button").ToggleButton, any>;
        styles: (context: any, definition: any) => import("@microsoft/fast-element").ElementStyles;
        shadowOptions: {
            delegatesFocus: true;
        };
    }> | undefined) => import("@microsoft/fast-foundation").FoundationElementRegistry<{
        baseName: string;
        template: (context: any, definition: any) => import("@microsoft/fast-element").ViewTemplate<import("./toggle-button/toggle-button").ToggleButton, any>;
        styles: (context: any, definition: any) => import("@microsoft/fast-element").ElementStyles;
        shadowOptions: {
            delegatesFocus: true;
        };
    }, typeof import("./toggle-button/toggle-button").ToggleButton>;
    register(container?: Container | undefined, ...rest: any[]): void;
};
