import { __decorate } from "tslib";
import { attr } from "@microsoft/fast-element";
import { Button as FoundationButton } from "@microsoft/fast-foundation";
/**
 * @internal
 */
export class Button extends FoundationButton {
    constructor() {
        super(...arguments);
        /**
         * The shape the button should have.
         *
         * @public
         * @remarks
         * HTML Attribute: shape
         */
        this.shape = "rounded";
        /**
         * The size the button should have.
         *
         * @public
         * @remarks
         * HTML Attribute: shape
         */
        this.size = "medium";
        /**
         * The button can fill its space.
         *
         * @public
         * @remarks
         * HTML Attribute: block
         */
        this.block = false;
        /**
         * The appearance the button should have.
         *
         * @public
         * @remarks
         * HTML Attribute: block
         */
        this.disabledFocusable = false;
    }
    /**
     * Applies 'icon-only' class when there is only an SVG in the default slot
     *
     * @public
     * @remarks
     */
    defaultSlottedContentChanged() {
        const slottedElements = this.defaultSlottedContent.filter(x => x.nodeType === Node.ELEMENT_NODE);
        if (slottedElements.length === 1 && slottedElements[0] instanceof SVGElement) {
            this.control.classList.add("icon-only");
        }
        else {
            this.control.classList.remove("icon-only");
        }
    }
}
__decorate([
    attr
], Button.prototype, "appearance", void 0);
__decorate([
    attr
], Button.prototype, "shape", void 0);
__decorate([
    attr
], Button.prototype, "size", void 0);
__decorate([
    attr({ mode: "boolean" })
], Button.prototype, "block", void 0);
__decorate([
    attr({ attribute: "disabledfocusable", mode: "boolean" })
], Button.prototype, "disabledFocusable", void 0);
