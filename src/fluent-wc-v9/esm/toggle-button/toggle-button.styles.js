import { tokens } from "@fluentui/react-theme";
import { css } from "@microsoft/fast-element";
import { appearanceBehavior } from "../utilities/appearance-behavior";
import { sizeBehavior } from "../utilities/size-behavior";
import { baseButtonStyles, largeButtonStyles, mediumButtonStyles, outlineButtonStyles, primaryButtonStyles, smallButtonStyles, subtleButtonStyles, transparentButtonStyles } from "../utilities/style/button";
/**
 * Styles for Button
 * @public
 */
export const toggleButtonStyles = (context, definition) => css `
    ${baseButtonStyles(context, definition)}

    :host([current-checked]) .base {
        background-color: ${tokens.colorNeutralBackground1Selected};
        border-color: ${tokens.colorNeutralStroke1};
        color: ${tokens.colorNeutralForeground1};
        border-width: ${tokens.strokeWidthThin}; 
    }

    :host([current-checked]:hover) .base {
        background-color: ${tokens.colorNeutralBackground1Hover};
        border-color: ${tokens.colorNeutralStroke1Hover};
        color: ${tokens.colorNeutralForeground1};
    }

    :host([current-checked]:active) .base {
        background-color: ${tokens.colorNeutralBackground1Pressed};
        border-color: ${tokens.colorNeutralStroke1Pressed};
        color: ${tokens.colorNeutralForeground1};
    }
`.withBehaviors(appearanceBehavior("primary", css `
        ${primaryButtonStyles(context, definition)}

        :host([current-checked][appearance="primary"]) .base {
            background-color: ${tokens.colorBrandBackgroundSelected};
            border-color: transparent;
            color: ${tokens.colorNeutralForegroundOnBrand};
        }

        :host([current-checked][appearance="primary"]:hover) .base {
            background-color: ${tokens.colorBrandBackgroundHover};
        }

        :host([current-checked][appearance="primary"]:active) .base {
            background-color: ${tokens.colorBrandBackgroundPressed};
        }
    `), appearanceBehavior("subtle", css `
        ${subtleButtonStyles(context, definition)}

        :host([current-checked][appearance="subtle"]) .base {
            background-color: ${tokens.colorSubtleBackgroundSelected};
            border-color: transparent;
            color: ${tokens.colorNeutralForeground2BrandSelected};
        }

        :host([current-checked][appearance="subtle"]:hover) .base {
            background-color: ${tokens.colorSubtleBackgroundHover};
            color: ${tokens.colorNeutralForeground2BrandHover};
        }

        :host([current-checked][appearance="subtle"]:active) .base {
            background-color: ${tokens.colorSubtleBackgroundPressed};
            color: ${tokens.colorNeutralForeground2BrandPressed};
        }
    `), appearanceBehavior("outline", css `
        ${outlineButtonStyles(context, definition)}

        :host([current-checked][appearance="outline"]) .base {
            background-color: ${tokens.colorTransparentBackgroundSelected};
        }

        :host([current-checked][appearance="outline"]:hover) .base {
            background-color: ${tokens.colorTransparentBackgroundHover};
        }

        :host([current-checked][appearance="outline"]:active) .base {
            background-color: ${tokens.colorTransparentBackgroundPressed};
        }
    `), appearanceBehavior("transparent", css `
        ${transparentButtonStyles(context, definition)}

        :host([current-checked][appearance="transparent"]) .base {
            background-color: ${tokens.colorTransparentBackgroundSelected};
            border-color: transparent;
            color: ${tokens.colorNeutralForeground2BrandSelected};
        }

        :host([current-checked][appearance="transparent"]:hover) .base {
            background-color: ${tokens.colorTransparentBackgroundHover};
            color: ${tokens.colorNeutralForeground2BrandHover};
        }

        :host([current-checked][appearance="transparent"]:active) .base {
            background-color: ${tokens.colorTransparentBackgroundPressed};
            color: ${tokens.colorNeutralForeground2BrandPressed};
        }
    `), sizeBehavior("small", css `
        ${smallButtonStyles(context, definition)}
    `), sizeBehavior("medium", css `
        ${mediumButtonStyles(context, definition)}
    `), sizeBehavior("large", css `
        ${largeButtonStyles(context, definition)}
    `));
