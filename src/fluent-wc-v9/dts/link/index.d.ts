import { Link } from "./link";
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
