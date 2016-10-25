import "./index.scss";
import * as React from "react";
import HeaderComponent from "./header";
import FooterComponent from "./footer";
import CanvasComponent from "./canvas";
import PreviewComponent from "./canvas/preview";
import { Workspace } from "@tandem/editor/browser/models";
import { Dependencies } from "@tandem/common/dependencies";
import { SyntheticDOMElement } from "@tandem/synthetic-browser";
import { FrontEndApplication } from "@tandem/editor/browser/application";
import { ReactComponentFactoryDependency } from "@tandem/editor/browser/dependencies";

export default class StageComponent extends React.Component<{ app: FrontEndApplication, workspace: Workspace, allElements: SyntheticDOMElement[] }, any> {
  render() {

    if (!this.props.app.workspace) return null;
    // <HeaderComponent {...this.props} />

    return (<div ref="container" className="m-editor-stage">
      <CanvasComponent {...this.props} zoom={this.props.workspace.transform.scale} dependencies={this.props.app.dependencies} />
      <FooterComponent {...this.props} />
    </div>);
  }
}
