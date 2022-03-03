import React from 'react';
import ReactDOM from 'react-dom';
import {
  FluentProvider,
  webLightTheme } from '@fluentui/react-components';
import {  provideReactWrapper } from '@microsoft/fast-react-wrapper';
import {  fluentButton, provideFluentDesignSystem } from './fluent-wc-v9/esm'
// provideReactWrapper(null, undefined)
const { wrap } = provideReactWrapper(React, provideFluentDesignSystem(null));
// const FluentButton = wrap(fluentButton() as any, {name: 'fluent-button', properties: ['appearance']});

// fluentButton()
ReactDOM.render(
    <FluentProvider style={{ display: "grid", gap: "12px"}} theme={webLightTheme}>
      {/* <FluentButton appearance="primary">Button</FluentButton> */}
    </FluentProvider>,
  document.getElementById('root')
);