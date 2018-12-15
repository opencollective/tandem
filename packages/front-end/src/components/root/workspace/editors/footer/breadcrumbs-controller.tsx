import * as React from "react";
import * as cx from "classnames";
import { Dispatch } from "redux";
import { BaseBreadcrumbsProps, Breadcrumb } from "./view.pc";
import { breadCrumbClicked } from "../../../../../actions";
import {
  InspectorNode,
  DependencyGraph,
  PCVisibleNode,
  getPCNode,
  getInspectorSourceNode,
  PCSourceTagNames,
  PCComponent,
  PCSlot,
  PCPlug,
  InspectorTreeNodeName
} from "paperclip";
import { getTreeNodeAncestors, EMPTY_ARRAY } from "tandem-common";

export type Props = {
  dispatch: Dispatch<any>;
  graph: DependencyGraph;
  rootInspectorNode: InspectorNode;
  selectedInspectorNode: InspectorNode;
} & BaseBreadcrumbsProps;

type BreadcrumbProps = {
  graph: DependencyGraph;
  dispatch: Dispatch<any>;
  inspectorNode: InspectorNode;
  sourceNode: PCVisibleNode | PCComponent | PCSlot | PCPlug;
  selected: boolean;
};

class EnhancedBreadcrumb extends React.PureComponent<BreadcrumbProps> {
  onClick = () => {
    this.props.dispatch(breadCrumbClicked(this.props.inspectorNode));
  };
  render() {
    const { onClick } = this;
    const { inspectorNode, selected, sourceNode, graph } = this.props;
    let label: string;
    if (sourceNode.name === PCSourceTagNames.PLUG) {
      label = (getPCNode(sourceNode.slotId, graph) as PCSlot).label;
    } else {
      label = sourceNode.label;
    }
    return (
      <Breadcrumb
        onClick={onClick}
        variant={cx({
          component:
            sourceNode.name === PCSourceTagNames.COMPONENT &&
            inspectorNode.name !== InspectorTreeNodeName.SHADOW,
          slot: sourceNode.name === PCSourceTagNames.SLOT,
          plug: sourceNode.name === PCSourceTagNames.PLUG,
          text: sourceNode.name === PCSourceTagNames.TEXT,
          selected,
          element: sourceNode.name === PCSourceTagNames.ELEMENT,
          shadow: inspectorNode.name === InspectorTreeNodeName.SHADOW
        })}
        labelProps={{ text: label }}
      />
    );
  }
}

export default (Base: React.ComponentClass<BaseBreadcrumbsProps>) =>
  class BreadcrumbsController extends React.PureComponent<Props> {
    render() {
      const {
        selectedInspectorNode,
        rootInspectorNode,
        dispatch,
        graph,
        ...rest
      } = this.props;

      const items = selectedInspectorNode
        ? [selectedInspectorNode]
            .concat(
              getTreeNodeAncestors(
                selectedInspectorNode.id,
                rootInspectorNode
              ) || EMPTY_ARRAY
            )
            .reverse()
            .map(inspectorNode => {
              const sourceNode = getInspectorSourceNode(
                inspectorNode as InspectorNode,
                rootInspectorNode,
                graph
              );
              return (
                <EnhancedBreadcrumb
                  graph={graph}
                  dispatch={dispatch}
                  key={inspectorNode.id}
                  selected={inspectorNode.id === selectedInspectorNode.id}
                  inspectorNode={inspectorNode as InspectorNode}
                  sourceNode={sourceNode as PCVisibleNode}
                />
              );
            })
        : EMPTY_ARRAY;

      return <Base {...rest} items={items} />;
    }
  };
