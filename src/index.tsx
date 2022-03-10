/** @jsxRuntime classic */
/** @jsx jsx */
/** @jsx h */
import h from "./pragma";
import React from "react";
import ReactDOM from "react-dom";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { FluentButton } from "./fluent-wc-v9";

enum Component {
  Button = "button",
  Mixed = "mixed",
  Card = "card",
}

type Repeat = string;

const component = new URLSearchParams(window.location.search).get(
  "component"
) as Component;
const repeat = new URLSearchParams(window.location.search).get(
  "repeatNum"
) as Repeat;

const repeatNumber = parseInt(repeat);

const renderComponent = () => {
  switch (component) {
    case Component.Button:
      return repeatNumber > 0 ? (
        [...Array(repeatNumber)].map((e, i) => (
          <FluentButton appearance="primary" key={i}>
            Button
          </FluentButton>
        ))
      ) : (
        <FluentButton appearance="primary">Button</FluentButton>
      );
    case Component.Card:
      return <div>this is a card</div>;
    case Component.Mixed:
      return <div>this is a mixed</div>;
    default:
      return <FluentButton appearance="primary">Button</FluentButton>;
  }
};

ReactDOM.render(
  <FluentProvider
    style={{ display: "grid", gap: "12px" }}
    theme={webLightTheme}
  >
    {renderComponent()}
  </FluentProvider>,
  document.getElementById("root")
);
