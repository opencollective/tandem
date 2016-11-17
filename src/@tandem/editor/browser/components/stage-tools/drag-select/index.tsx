import "./index.scss";
import * as React from "react";
import { startDrag } from "@tandem/common/utils/component";
import { PointerTool } from "@tandem/editor/browser/models/pointer-tool";
import { MetadataKeys } from "@tandem/editor/browser/constants";
import { SelectRequest, MouseAction } from "@tandem/editor/browser/actions";
import { ReactComponentFactoryProvider } from "@tandem/editor/browser/providers";
import { VisibleSyntheticElementCollection } from "@tandem/editor/browser/collections";
import { BoundingRect, BaseApplicationComponent } from "@tandem/common";

export class DragSelectStageToolComponent extends BaseApplicationComponent<{ app: any, zoom: number, tool: PointerTool }, any> {

  startDrag(event) {

    const container = (this.refs as any).container;
    if (!container) return;

    const b = container.getBoundingClientRect();

    // const visibleEntities = new VisibleDOMEntityCollection(...this.props.app.workspace.document.querySelectorAll("*"));
    const visibleEntities = [];

    const left = (event.clientX - b.left) / this.props.zoom;
    const top  = (event.clientY - b.top) / this.props.zoom;

    this.setState({
      left: left,
      top : top,
      dragging: true
    });

    startDrag(event, (event2, { delta }) => {

      let x = left;
      let y = top;
      let w = Math.abs(delta.x / this.props.zoom);
      let h = Math.abs(delta.y / this.props.zoom);


      if (delta.x < 0) {
        x = left - w;
      }

      if (delta.y < 0) {
        y = top - h;
      }

      this.setState({
        left: x,
        top: y,
        width: w,
        height: h,
      });

      const bounds = new BoundingRect(x, y, x + w, y + h);

      const selection = [];

      visibleEntities.forEach(function (entity) {
        if (entity.editable && (entity.metadata.get(MetadataKeys.CANVAS_ROOT) !== true || entity.children.length === 0) && entity.absoluteBounds.intersects(bounds)) {
          selection.push(entity);
        }
      });

      this.props.app.bus.dispatch(new SelectRequest(selection));

    }, () => {
      this.setState({
        dragging: false,
        left: 0,
        top: 0,
        width: 0,
        height: 0
      });
    });
  }

  render() {

    if (1 + 1) return null;

    if (!(this.props.tool instanceof PointerTool)) return null;

    const style = {
      left   : this.state.left,
      top    : this.state.top,
      width  : this.state.width,
      height : this.state.height,
      boxShadow: `0 0 0 ${1 / this.props.zoom}px #CCC`
    };

    const box = (<div style={style} className="m-drag-select--box">
    </div>);

    return (<div ref="container" className="m-drag-select">
      {this.state.dragging ? box : void 0}
    </div>);
  }
}

