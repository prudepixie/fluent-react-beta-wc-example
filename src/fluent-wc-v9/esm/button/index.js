import { Button as FoundationButton } from "@microsoft/fast-foundation";
import { Button } from "./button";
import { buttonTemplate as template } from "./button.template";
import { buttonStyles as styles } from "./button.styles";
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
export const fluentButton = Button.compose({
    baseName: "button",
    baseClass: FoundationButton,
    template,
    styles,
    shadowOptions: {
        delegatesFocus: true,
    },
});
