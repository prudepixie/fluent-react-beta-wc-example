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
export const allComponents = {
    fluentButton,
    fluentLink,
    fluentToggleButton,
    register(container, ...rest) {
        if (!container) {
            // preserve backward compatibility with code that loops through
            // the values of this object and calls them as funcs with no args
            return;
        }
        for (const key in this) {
            if (key === "register") {
                continue;
            }
            this[key]().register(container, ...rest);
        }
    },
};
