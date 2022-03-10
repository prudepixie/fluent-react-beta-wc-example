import { tokens } from "@fluentui/react-theme";
import { css } from "@microsoft/fast-element";
import { display } from "@microsoft/fast-foundation";

/**
 * Base button styles
 */
export const baseButtonStyles = (context: any, definition: any) => css`
    ${display("inline-block")}

    :host .base {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        vertical-align: middle;
        margin: 0;
        max-width: 280px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        background-color: ${tokens.colorNeutralBackground1};
        color: ${tokens.colorNeutralForeground1};
        border: ${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1};
        font-family: ${tokens.fontFamilyBase};
        outline-style: none;
    }

    :host(:hover) .base {
        background-color: ${tokens.colorNeutralBackground1Hover};
        border-color: ${tokens.colorNeutralStroke1Hover};
        color: ${tokens.colorNeutralForeground1};
        cursor: pointer;
    }

    :host(:active) .base {
        background-color: ${tokens.colorNeutralBackground1Pressed};
        border-color: ${tokens.colorNeutralStroke1Pressed};
        color: ${tokens.colorNeutralForeground1};
        outline-style: none;
    }

    :host([size][shape="circular"]) .base {
        border-radius: ${tokens.borderRadiusCircular};
    }

    :host([size][shape="square"]) .base {
        border-radius: ${tokens.borderRadiusNone};
    }

    :host([disabled]) .base,
    :host .base[aria-disabled="true"] {
        background-color: ${tokens.colorNeutralBackgroundDisabled};
        border-color: ${tokens.colorNeutralStrokeDisabled};
        color: ${tokens.colorNeutralForegroundDisabled};
        cursor: not-allowed;
    }

    :host .start,
    :host .end {
        display: inline-flex;
        align-content: center;
        justify-content: center;
    }
`;

/**
 * Primary button styles
 */
export const primaryButtonStyles = (context: any, definition: any) => css`
    :host([appearance="primary"]) .base {
        background-color: ${tokens.colorBrandBackground};
        border-color: transparent;
        color: ${tokens.colorNeutralForegroundOnBrand};
    }

    :host([appearance="primary"]:hover) .base {
        background-color: ${tokens.colorBrandBackgroundHover};
        border-color: transparent;
        color: ${tokens.colorNeutralForegroundOnBrand};
    }

    :host([appearance="primary"]:active) .base {
        background-color: ${tokens.colorBrandBackgroundPressed};
        border-color: transparent;
        color: ${tokens.colorNeutralForegroundOnBrand};
    }

    :host([appearance="primary"][disabled]) .base,
    :host([appearance="primary"][disabled]:hover) .base,
    :host([appearance="primary"][disabled]:active) .base,
    :host([appearance="primary"]) .base[aria-disabled="true"],
    :host([appearance="primary"]:hover) .base[aria-disabled="true"],
    :host([appearance="primary"]:active) .base[aria-disabled="true"] {
        background-color: ${tokens.colorNeutralBackgroundDisabled};
        border-color: ${tokens.colorNeutralStrokeDisabled};
        color: ${tokens.colorNeutralForegroundDisabled};
        cursor: not-allowed;
        border-color: transparent;
    }
`;

/**
 * Subtle button styles
 */
export const subtleButtonStyles = (context: any, definition: any) => css`
    :host([appearance="subtle"]) .base {
        background-color: ${tokens.colorSubtleBackground};
        border-color: transparent;
        color: ${tokens.colorNeutralForeground2};
    }

    :host([appearance="subtle"]:hover) .base {
        background-color: ${tokens.colorSubtleBackgroundHover};
        border-color: transparent;
        color: ${tokens.colorNeutralForeground2BrandHover};
    }

    :host([appearance="subtle"]:active) .base {
        background-color: ${tokens.colorSubtleBackgroundPressed};
        border-color: transparent;
        color: ${tokens.colorNeutralForeground2BrandPressed};
    }

    :host([appearance="subtle"][disabled]) .base {
        background-color: ${tokens.colorNeutralBackgroundDisabled};
        border-color: ${tokens.colorNeutralStrokeDisabled};
        color: ${tokens.colorNeutralForegroundDisabled};
        cursor: not-allowed;
    }

    :host([appearance="subtle"][disabled]) .base,
    :host([appearance="subtle"][disabled]:hover) .base,
    :host([appearance="subtle"][disabled]:active) .base {
        background-color: transparent;
        border-color: transparent;
    }
`;

/**
 * Outline button styles
 */
export const outlineButtonStyles = (context: any, definition: any) => css`
    :host([appearance="outline"]) .base {
        background-color: ${tokens.colorTransparentBackground};
    }

    :host([appearance="outline"]:hover) .base {
        background-color: ${tokens.colorTransparentBackgroundHover};
    }

    :host([appearance="outline"]:active) .base {
        background-color: ${tokens.colorTransparentBackgroundPressed};
    }
`;

/**
 * Transparent button styles
 */
 export const transparentButtonStyles = (context: any, definition: any) => css`
    :host([appearance="transparent"]) .base {
        background-color: ${tokens.colorTransparentBackground};
        border-color: transparent;
        color: ${tokens.colorNeutralForeground2};
    }

    :host([appearance="transparent"]:hover) .base {
        background-color: ${tokens.colorTransparentBackgroundHover};
        border-color: transparent;
        color: ${tokens.colorNeutralForeground2BrandHover};
    }

    :host([appearance="transparent"]:active) .base {
        background-color: ${tokens.colorTransparentBackgroundPressed};
        border-color: transparent;
        color: ${tokens.colorNeutralForeground2BrandPressed};
    }

    :host([appearance="transparent"][disabled]) .base,
    :host([appearance="transparent"][disabled]:hover) .base,
    :host([appearance="transparent"][disabled]:active) .base {
        background-color: transparent;
        border-color: transparent;
        color: ${tokens.colorNeutralForegroundDisabled};
    }
`;

/**
 * Small button styles
 */
export const smallButtonStyles = (context: any, definition: any) => css`
    :host([size="small"]) .base {
        gap: 4px;
        padding: 0 8px;
        height: 24px;
        min-width: 64px;
        border-radius: ${tokens.borderRadiusSmall};
        font-size: ${tokens.fontSizeBase200};
        font-weight: ${tokens.fontWeightRegular};
        line-height: ${tokens.lineHeightBase200};
    }

    :host([size="small"]) ::slotted(svg) {
        font-size: 20px;
        height: 20px;
        width: 20px;
    }

    :host([size="small"]) .base.icon-only {
        padding: 4px;
        min-width: 28px;
        max-width: 28px;
    }
`;

/**
 * Medium button styles
 */
export const mediumButtonStyles = (context: any, definition: any) => css`
    :host([size="medium"]) .base {
        gap: 6px;
        padding: 0 12px;
        height: 32px;
        min-width: 96px;
        border-radius: ${tokens.borderRadiusMedium};
        font-size: ${tokens.fontSizeBase300};
        font-weight: ${tokens.fontWeightSemibold};
        line-height: ${tokens.lineHeightBase300};
    }

    :host([size="medium"]) ::slotted(svg) {
        font-size: 20px;
        height: 20px;
        width: 20px;
    }

    :host([size="medium"]) .base.icon-only {
        padding: 0;
        min-width: 32px;
        max-width: 32px;
    }
`;

export const largeButtonStyles = (context: any, definition: any) => css`
    :host([size="large"]) .base {
        gap: 6px;
        padding: 0 16px;
        height: 40px;
        min-width: 96px;
        border-radius: ${tokens.borderRadiusLarge};
        font-size: ${tokens.fontSizeBase300};
        font-weight: ${tokens.fontWeightSemibold};
        line-height: ${tokens.lineHeightBase300};
    }

    :host([size="large"]) ::slotted(svg) {
        font-size: 24px;
        height: 24px;
        width: 24px;
    }

    :host([size="large"]) .base.icon-only {
        padding: 0;
        min-width: 40px;
        max-width: 40px;
    }
`;