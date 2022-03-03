import { __decorate } from "tslib";
import { attr } from "@microsoft/fast-element";
import { Anchor as FoundationAnchor } from "@microsoft/fast-foundation";
/**
 * @internal
 */
export class Link extends FoundationAnchor {
    constructor() {
        super(...arguments);
        /**
         * The link renders inline with text.
         *
         * @public
         * @remarks
         * HTML Attribute: inline
         */
        this.inline = false;
        /**
         * The link is disabled
         *
         * @public
         * @remarks
         * HTML Attribute: disabled
         */
        this.disabled = false;
        /**
         * The appearance the button should have.
         *
         * @public
         * @remarks
         * HTML Attribute: block
         */
        this.disabledFocusable = false;
    }
    handleDisabledClick(e) {
        if (this.disabled || this.disabledFocusable) {
            e.preventDefault();
        }
        else {
            return true;
        }
    }
    handleDisabledKeydown(e) {
        if ((this.disabled || this.disabledFocusable) && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            e.stopPropagation();
        }
        else {
            return true;
        }
    }
}
__decorate([
    attr
], Link.prototype, "appearance", void 0);
__decorate([
    attr({ mode: "boolean" })
], Link.prototype, "inline", void 0);
__decorate([
    attr({ mode: "boolean" })
], Link.prototype, "disabled", void 0);
__decorate([
    attr({ attribute: "disabledfocusable", mode: "boolean" })
], Link.prototype, "disabledFocusable", void 0);
