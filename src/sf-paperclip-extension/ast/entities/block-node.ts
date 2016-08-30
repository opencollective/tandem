import { getContext } from "./utils";
import { IPCEntity } from "./base";
import { parsePC } from "sf-paperclip-extension/ast";
import { Node as MarkupNode } from "sf-core/markup";
import { PCBlockNodeExpression } from "sf-paperclip-extension/ast/expressions";
import { EntityFactoryDependency } from "sf-core/dependencies";
import { GroupNodeSection, IDOMSection } from "sf-html-extension/dom";
import { HTMLContainerEntity, BaseHTMLContainerEntity, HTMLTextEntity, HTMLTextExpression, HTMLValueNodeEntity, HTMLExpression, IHTMLEntity } from "sf-html-extension/ast";
import { INodeEntity, EntityMetadata, IContainerNodeEntity, IEntity, IValueNodeEntity } from "sf-core/ast";

export class PCBlockNodeEntity extends BaseHTMLContainerEntity<PCBlockNodeExpression> implements IValueNodeEntity  {
  private _script: Function;
  public value: any;
  public source: PCBlockNodeExpression;

  constructor(source: PCBlockNodeExpression) {
    super("#block", source);
    this.willSourceChange(source);
  }

  protected willSourceChange(source: PCBlockNodeExpression) {
    this._script = new Function("context", `with(context) { return ${source.value}; }`);
  }

  createSection() {
    return new GroupNodeSection();
  }

  patch(source: PCBlockNodeEntity) {
    super.patch(source);
  }

  get context() {
    return getContext(this);
  }

  async load() {
    let value;

    try {
      value = this._script(this.context);
    } catch (e) {
      return this.appendChild(new HTMLTextEntity(new HTMLTextExpression(`\${${this.source.value}}`, this.source.position)))
    }

    this.value = value;

    if (value instanceof MarkupNode) {
      this.appendChild(value);
    } else {
      const child = EntityFactoryDependency.createEntityFromSource(parsePC(String(value)), this._dependencies);
      this.appendChild(child);
      await child.load();
    }

  }

  clone() {
    return new PCBlockNodeEntity(this.source);
  }
}

export const bcBlockNodeEntityDependency = new EntityFactoryDependency("#block", PCBlockNodeEntity);