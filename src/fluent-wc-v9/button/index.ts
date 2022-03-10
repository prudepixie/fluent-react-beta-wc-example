import React from 'react'
import { customElement } from "@microsoft/fast-element";
import { Button } from "./button";
import { buttonTemplate as template } from "./button.template";
import { buttonStyles as styles } from "./button.styles";

@customElement({
    name: 'fluent-button',
    template: template({}, {}),
    styles: styles({}, {}),
    shadowOptions: {
        delegatesFocus: true,
    },
})


export class FluentButton extends Button {}

export interface FluentButton extends React.Component<{
    appearance: string;
} & React.HTMLAttributes<FluentButton>> {}