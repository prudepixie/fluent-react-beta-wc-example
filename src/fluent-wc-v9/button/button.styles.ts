import { css } from "@microsoft/fast-element";
import { appearanceBehavior } from "../utilities/appearance-behavior";
import { sizeBehavior } from "../utilities/size-behavior";
import {
    baseButtonStyles,
    largeButtonStyles,
    mediumButtonStyles,
    outlineButtonStyles,
    primaryButtonStyles,
    smallButtonStyles,
    subtleButtonStyles,
    transparentButtonStyles
} from "../utilities/style/button";

/**
 * Styles for Button
 * @public
 */
export const buttonStyles = (context: any, definition: any) => css`
    ${baseButtonStyles(context, definition)}
`.withBehaviors(
    appearanceBehavior("primary", css`
        ${primaryButtonStyles(context, definition)}
    `),
    appearanceBehavior("subtle", css`
        ${subtleButtonStyles(context, definition)}
    `),
    appearanceBehavior("outline", css`
        ${outlineButtonStyles(context, definition)}
    `),
    appearanceBehavior("transparent", css`
        ${transparentButtonStyles(context, definition)}
    `),
    sizeBehavior("small", css`
        ${smallButtonStyles(context, definition)}
    `),
    sizeBehavior("medium", css`
        ${mediumButtonStyles(context, definition)}
    `),
    sizeBehavior("large", css`
        ${largeButtonStyles(context, definition)}
    `)
);