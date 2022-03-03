import { __decorate } from "tslib";
import { attr, observable } from "@microsoft/fast-element";
import { Button } from "../button/button";
/**
 * @internal
 */
export class ToggleButton extends Button {
    constructor() {
        super();
        /**
         * Tracks whether the "checked" property has been changed.
         * This is necessary to provide consistent behavior with
         * normal input checkboxes
         */
        this.dirtyChecked = false;
        /**
         * Provides the default checkedness of the input element
         * Passed down to proxy
         *
         * @public
         * @remarks
         * HTML Attribute: checked
         */
        this.checkedAttribute = false;
        /**
         * The checked state of the control.
         *
         * @public
         */
        this.checked = false;
        /**
         * The current checkedness of the element. This property serves as a mechanism
         * to set the `checked` property through both property assignment and the
         * .setAttribute() method. This is useful for setting the field's checkedness
         * in UI libraries that bind data through the .setAttribute() API
         * and don't support IDL attribute binding.
         */
        this.currentChecked = false;
        /**
         * @internal
         */
        this.keypressHandler = (e) => {
            if (!this.disabled && !this.disabledFocusable) {
                switch (e.key) {
                    case "Enter":
                    case " ":
                        this.checked = !this.checked;
                        break;
                }
            }
        };
        /**
         * @internal
         */
        this.clickHandler = (e) => {
            if (!this.disabled && !this.disabledFocusable) {
                this.checked = !this.checked;
            }
        };
        // Re-initialize dirtyChecked because initialization of other values
        // causes it to become true
        this.dirtyChecked = false;
    }
    checkedAttributeChanged() {
        this.defaultChecked = this.checkedAttribute;
    }
    defaultCheckedChanged() {
        if (!this.dirtyChecked) {
            // Setting this.checked will cause us to enter a dirty state,
            // but if we are clean when defaultChecked is changed, we want to stay
            // in a clean state, so reset this.dirtyChecked
            this.checked = this.defaultChecked;
            this.dirtyChecked = false;
        }
    }
    checkedChanged(prev, next) {
        if (!this.dirtyChecked) {
            this.dirtyChecked = true;
        }
        this.currentChecked = this.checked;
        if (prev !== undefined) {
            this.$emit("change");
        }
    }
    currentCheckedChanged(prev, next) {
        this.checked = this.currentChecked;
    }
}
__decorate([
    attr({ attribute: "checked", mode: "boolean" })
], ToggleButton.prototype, "checkedAttribute", void 0);
__decorate([
    observable
], ToggleButton.prototype, "defaultChecked", void 0);
__decorate([
    observable
], ToggleButton.prototype, "checked", void 0);
__decorate([
    attr({ attribute: "current-checked", mode: "boolean" })
], ToggleButton.prototype, "currentChecked", void 0);
