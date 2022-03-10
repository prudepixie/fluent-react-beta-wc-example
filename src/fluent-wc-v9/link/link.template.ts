import { html, ref } from "@microsoft/fast-element";
import type { ViewTemplate } from "@microsoft/fast-element";
import type { FoundationElementDefinition, FoundationElementTemplate } from "@microsoft/fast-foundation";
import type { Link } from "./link";

/**
 * The template for the link component.
 * @public
 */
export const linkTemplate: FoundationElementTemplate<
    ViewTemplate<Link>,
    FoundationElementDefinition
> = (context, definition) => html`
    <a
        class="base"
        part="base"
        download="${x => x.download}"
        tabindex="${x => x.disabledFocusable ? "0" : x.disabled ? "-1" : !!x.tabIndex || void 0}"
        href="${x => x.href}"
        hreflang="${x => x.hreflang}"
        ping="${x => x.ping}"
        referrerpolicy="${x => x.referrerpolicy}"
        rel="${x => x.rel}"
        target="${x => x.target}"
        type="${x => x.type}"
        aria-atomic="${x => x.ariaAtomic}"
        aria-busy="${x => x.ariaBusy}"
        aria-controls="${x => x.ariaControls}"
        aria-current="${x => x.ariaCurrent}"
        aria-describedby="${x => x.ariaDescribedby}"
        aria-details="${x => x.ariaDetails}"
        aria-disabled="${x => x.disabled || x.disabledFocusable || x.ariaDisabled}"
        aria-errormessage="${x => x.ariaErrormessage}"
        aria-expanded="${x => x.ariaExpanded}"
        aria-flowto="${x => x.ariaFlowto}"
        aria-haspopup="${x => x.ariaHaspopup}"
        aria-hidden="${x => x.ariaHidden}"
        aria-invalid="${x => x.ariaInvalid}"
        aria-keyshortcuts="${x => x.ariaKeyshortcuts}"
        aria-label="${x => x.ariaLabel}"
        aria-labelledby="${x => x.ariaLabelledby}"
        aria-live="${x => x.ariaLive}"
        aria-owns="${x => x.ariaOwns}"
        aria-relevant="${x => x.ariaRelevant}"
        aria-roledescription="${x => x.ariaRoledescription}"
        @click="${(x, c) => x.handleDisabledClick(c.event as  MouseEvent)}"
        @keydown="${(x, c) => x.handleDisabledKeydown(c.event as  KeyboardEvent)}"
        ${ref("control")}
    >
        <slot></slot>
    </a>
`;
