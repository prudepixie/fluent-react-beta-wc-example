import React from 'react';
import ReactDOM from 'react-dom';
// import {
//   FluentProvider,
//   webLightTheme } from '@fluentui/react-components';
import {  provideReactWrapper } from '@microsoft/fast-react-wrapper';

// import { fluentButton } from './button';
// import { provideFluentDesignSystem } from './fluent-design-system';

import { fluentButton, provideFluentDesignSystem } from 'fluent-wc-v9';



const { wrap } = provideReactWrapper(React);
export const FluentButton = wrap(fluentButton().type, {name: 'fluent-button', properties: ['appearance']});

provideFluentDesignSystem().register(fluentButton())

ReactDOM.render(
  <React.StrictMode>
    {/* <FluentProvider style={{ display: "grid", gap: "12px"}} theme={webLightTheme}> */}
      <FluentButton>Button</FluentButton>
    {/* </FluentProvider> */}
  </React.StrictMode>,
  document.getElementById('root')
);