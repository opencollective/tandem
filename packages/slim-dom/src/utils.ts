import { SlimParentNode, SlimBaseNode, SlimVMObjectType, SlimElement, SlimTextNode, VMObject, SlimCSSStyleDeclaration, SlimCSSStyleRule, SlimCSSGroupingRule, SlimCSSMediaRule, SlimCSSRule, SlimCSSStyleSheet, VMObjectSource, SlimStyleElement, SlimElementAttribute } from "./state";
import { uniq, flatten } from "lodash";
import crc32 = require("crc32");

let previousPurgeTime = 0;
const DUMP_DEFAULT_ANCHOR_INTERVAL = 1000 * 60 * 5;
let DEFAULT_ANCHOR: any = {};

export function weakMemo<TFunc extends (...args: any[]) => any>(func: TFunc, mapMemo: (value?: any) => any = (value => value)): TFunc {
  let count = 1;
  const memoKey = Symbol();
  const hashKey = Symbol();
  return function() {
    if (previousPurgeTime && Date.now() - DUMP_DEFAULT_ANCHOR_INTERVAL > previousPurgeTime) {
      previousPurgeTime = Date.now();
      DEFAULT_ANCHOR = {};
    }
    let hash = "";
    let anchor: any = DEFAULT_ANCHOR;

    for (let i = 0, n = arguments.length; i < n; i++) {
      const arg = arguments[i];

      let hashPart;

      if (arg && typeof arg === "object") {
        anchor = arg;
        hashPart = arg[hashKey] && arg[hashKey].self === arg ? arg[hashKey].value : (arg[hashKey] = { self: arg, value: ":" + (count++) }).value;
      } else {
        hashPart = ":" + arg;
      }

      hash += hashPart;
    }

    if (!anchor[memoKey] || anchor[memoKey].self !== anchor) anchor[memoKey] = { self: anchor };
    return mapMemo(anchor[memoKey].hasOwnProperty(hash) ? anchor[memoKey][hash] : anchor[memoKey][hash] = func.apply(this, arguments));

  } as any as TFunc;
};

export const pushChildNode = <TParent extends SlimParentNode>(parent: TParent, child: SlimBaseNode): TParent => ({
  ...(parent as any),
  childNodes: [
    ...parent.childNodes,
    child
  ]
});

export const removeChildNodeAt = <TParent extends SlimParentNode>(parent: TParent, index: number): TParent => ({
  ...(parent as any),
  childNodes: [
    ...parent.childNodes.slice(0, index),
    ...parent.childNodes.slice(index + 1)
  ]
});

export const insertChildNode = <TParent extends SlimParentNode>(parent: TParent, child: SlimBaseNode, index: number = Number.MAX_SAFE_INTEGER): TParent => ({
  ...(parent as any),
  childNodes: [
    ...parent.childNodes.slice(0, index),
    child,
    ...parent.childNodes.slice(index)
  ]
});

export const moveChildNode = <TParent extends SlimParentNode>(parent: TParent, index: number, newIndex: number) => {

  const childNodes = [...parent.childNodes];
  const child = childNodes[index];
  childNodes.splice(index, 1);
  childNodes.splice(newIndex, 0, child);
  
  return {
    ...(parent as any),
    childNodes
  };
};

export const insertCSSRule = <TParent extends SlimCSSGroupingRule>(parent: TParent, child: SlimBaseNode, index: number = Number.MAX_SAFE_INTEGER): TParent => ({
  ...(parent as any),
  rules: [
    ...parent.rules.slice(0, index),
    child,
    ...parent.rules.slice(index)
  ]
});

export const removeCSSRuleAt = <TParent extends SlimCSSGroupingRule>(parent: TParent, index: number): TParent => ({
  ...(parent as any),
  rules: [
    ...parent.rules.slice(0, index),
    ...parent.rules.slice(index + 1)
  ]
});

export const moveCSSRule = <TParent extends SlimCSSGroupingRule>(parent: TParent, index: number, newIndex: number): TParent => {

  const rules = [...parent.rules];
  const child = rules[index];
  rules.splice(index, 1);
  rules.splice(newIndex, 0, child);
  
  return {
    ...(parent as any),
    rules
  };
};

export const setCSSSelectorText = <TRule extends SlimCSSStyleRule>(rule: TRule, selectorText: string): TRule => ({
  ...(rule as any),
  selectorText
});

export const setCSSStyleProperty = <TRule extends SlimCSSStyleRule>(rule: TRule, name: string, newValue: any, index: number): TRule => ({
  ...(rule as any), 
  style: {
    ...rule.style,
    [name]: newValue
  }
});

export const stringifyNode = weakMemo((node: SlimBaseNode, includeShadow?: boolean) => {
  switch(node.type) {
    case SlimVMObjectType.TEXT: {
      const text = node as SlimTextNode;
      return text.value;
    }
    case SlimVMObjectType.ELEMENT: {
      const el = node as SlimElement;
      let buffer = `<${el.tagName} `;
      for (let i = 0, {length} = el.attributes; i < length; i++) {
        const attr = el.attributes[i];
        buffer += ` ${attr.name}=${JSON.stringify(attr.value)}`;
      }
      buffer += `>`;
      if (includeShadow && el.shadow)  {
        buffer += `<#shadow>`;
        buffer += stringifyNode(el.shadow, includeShadow);
        buffer += `</#shadow>`;
      }
      for (let i = 0, {length} = el.childNodes; i < length; i++) {
        buffer += stringifyNode(el.childNodes[i], includeShadow);
      }
      buffer += `</${el.tagName}>`;
      return buffer;
    }
    case SlimVMObjectType.DOCUMENT_FRAGMENT: 
    case SlimVMObjectType.DOCUMENT: {
      const el = node as SlimParentNode;
      let buffer = ``;
      for (let i = 0, {length} = el.childNodes; i < length; i++) {
        buffer += stringifyNode(el.childNodes[i], includeShadow);
      }
      return buffer;
    }
  }
});

export const getAttribute = (name: string, element: SlimElement) => element.attributes.find(attribute => attribute.name === name);

export const hasAttribute = (name: string, element: SlimElement) => {
  return getAttribute(name, element) != null;
};

export const getAttributeValue = (name: string, element: SlimElement) => {
  const attribute = getAttribute(name, element);
  return attribute && attribute.value;
};

export type FlattenedObject = {
  parentId: string;
  value: VMObject;
};

export type FlattenedObjects = {
  [identifier: string]: FlattenedObject;
};

export const getNodeAncestors = weakMemo((value: SlimBaseNode, root: SlimParentNode): SlimParentNode[] => {
  const objects = flattenObjects(root);
  let current = objects[objects[value.id].parentId];
  let ancestors: SlimParentNode[] = [];

  while(current) {
    ancestors.push(current.value as any as SlimParentNode);
    current = objects[current.parentId];
  }

  return ancestors;
});

export const getVMObjectPath = weakMemo((value: SlimBaseNode, root: SlimParentNode): any[] => {
  const objects = flattenObjects(root);
  let current = objects[value.id];
  const path: any[] = [];

  while(current && current.parentId) {
    const parentInfo = objects[current.parentId];

    // TODO - check if css rules
    if ((parentInfo.value as SlimElement).shadow === current.value) { 
      path.unshift("shadow");
    } else if ((parentInfo.value as SlimStyleElement).sheet === current.value) {
      path.unshift("sheet");
    } else if ((parentInfo.value as SlimParentNode).childNodes) {
      path.unshift((parentInfo.value as SlimParentNode).childNodes.indexOf(current.value));
    } else if ((parentInfo.value as SlimCSSGroupingRule).rules) {
      path.unshift((parentInfo.value as SlimCSSGroupingRule).rules.indexOf(current.value));
    }
    current = parentInfo;
  }

  return path;
});

// not memoized because this isn't a very expensive op
export const getVMObjectFromPath = (path: any[], root: VMObject): VMObject => {
  let current = root;
  for (let i = 0, {length} = path; i < length; i++) {
    const part = path[i];
    if (part === "shadow") {
      current = (current as SlimElement).shadow;
    } else if (part === "sheet") {
      current = (current as SlimStyleElement).sheet;
    } else if ((current as SlimParentNode).childNodes) {
      current = (current as SlimParentNode).childNodes[part];
    } else if ((current as SlimCSSGroupingRule).rules) {
      current = (current as SlimCSSGroupingRule).rules[part];
    }

    if (!current) {
      return null;
    }
  }

  return current;
};

export const getVmObjectSourceUris = weakMemo((node: SlimBaseNode) => {
  return uniq(getNestedSourceUris(node));
});

const getNestedSourceUris = weakMemo((node: SlimBaseNode): string[] => {
  const sources: string[] = [];
  if (node.source && node.source.uri) {
    sources.push(node.source.uri);
  }
  if (node.type === SlimVMObjectType.ELEMENT) {
    const element = node as SlimElement;
    if (element.shadow) {
      sources.push(...getNestedSourceUris(element.shadow));
    }
  }

  if (node.type === SlimVMObjectType.ELEMENT || node.type === SlimVMObjectType.DOCUMENT_FRAGMENT) {
    sources.push(...flatten((node as SlimParentNode).childNodes.map(child => getNestedSourceUris(child))));
  }

  return sources;
});

export const getNestedObjectById = weakMemo((id: string, root: SlimParentNode): VMObject => {
  const ref = flattenObjects(root);
  return ref[id] && ref[id].value;
});

export const flattenObjects = weakMemo((value: VMObject, parentId?: string): FlattenedObjects => {
  return Object.assign({}, ...layoutObjects(value, parentId));
});

const layoutObjects = weakMemo((value: any, parentId: string): FlattenedObjects[] => {
  switch(value.type) {
    case SlimVMObjectType.TEXT: {
      const node = value as SlimTextNode;
      return [
        {
          [node.id]: {
            parentId,
            value
          }
        }
      ]
    }
    case SlimVMObjectType.ELEMENT: {
      const element = value as SlimElement;
      const children = [];
      let base = {
        [element.id]: {
          parentId,
          value
        }
      };

      const style: SlimCSSStyleDeclaration = getAttributeValue("style", element);
      if (style && typeof style === "object") {
        base[style.id] = {
          parentId: element.id,
          value: style,
        };
      }

      if (element.tagName === "style") {
        children.push(...layoutCSSObjects((element as SlimStyleElement).sheet, element.id));
      } else {
        if (element.shadow) {
          children.push(...layoutObjects(element.shadow, element.id));
        }
        children.push(...layoutChildNodes(element.childNodes, element.id));
      }

      children.push(base);
      return children;
    }
    case SlimVMObjectType.DOCUMENT: 
    case SlimVMObjectType.DOCUMENT_FRAGMENT: {
      return [
        {
          [value.id]: { parentId, value }
        },
        ...layoutChildNodes((value as SlimParentNode).childNodes, value.id)
      ]
    }
  }
});

const layoutCSSObjects = weakMemo((value: any, parentId: string): FlattenedObjects[] => {
  const children: FlattenedObjects[] = [];
  switch(value.type) {
    case SlimVMObjectType.MEDIA_RULE:
    case SlimVMObjectType.STYLE_SHEET: {
      const grouping = value as SlimCSSGroupingRule;
      return [
        {
          [grouping.id]: {
            parentId,
            value,
          }
        },
        ...layoutCSSRules(grouping.rules, grouping.id)
      ]
    }
    
    case SlimVMObjectType.STYLE_RULE: {
      const rule = value as SlimCSSStyleRule;
      return [{
        [rule.id]: {
          parentId,
          value,
        },
        [rule.style.id]: {
          parentId: rule.id,
          value: rule.style
        }
      }];
    }
  }
});

const layoutChildNodes = weakMemo((childNodes: SlimBaseNode[], parentId: string) => {
  const children = [];
  for (let i = 0, {length} = childNodes; i < length; i++) {
    children.push(...layoutObjects(childNodes[i], parentId));
  }
  return children;
});

const layoutCSSRules = weakMemo((rules: SlimCSSRule[], parentId: string) => {
  const children = [];
  for (let i = 0, {length} = rules; i < length; i++) {
    children.push(...layoutCSSObjects(rules[i], parentId));
  }
  return children;
});

export const getDocumentChecksum = weakMemo((document: SlimParentNode) => crc32(stringifyNode(document, true)));

export const replaceNestedChild = <TNode extends VMObject>(current: TNode, path: any[], child: SlimBaseNode, index: number = 0): TNode => {
  const part = path[index];
  if (index === path.length) {
    return child as TNode;
  }

  if (part === "shadow") {
    return {
      ...(current as any),
      shadow: replaceNestedChild((current as any).shadow, path, child, index + 1)
    }
  }

  if (part === "sheet") {
    return {
      ...(current as any),
      sheet: replaceNestedChild((current as any as SlimStyleElement).sheet, path, child, index + 1)
    }
  }

  if ((current as any as SlimParentNode).childNodes)  {
    const parentNode = current as any as SlimParentNode;
    return {
      ...(parentNode as any),
      childNodes: [
        ...parentNode.childNodes.slice(0, part),
        replaceNestedChild(parentNode.childNodes[part] as SlimParentNode, path, child, index + 1),
        ...parentNode.childNodes.slice(part + 1)
      ]  
    }
  } else if ((current as any as SlimCSSGroupingRule).rules) {
    const parentRule = current as any as SlimCSSGroupingRule;
    return {
      ...(parentRule as any),
      rules: [
        ...parentRule.rules.slice(0, part),
        replaceNestedChild(parentRule.rules[part] as SlimParentNode, path, child, index + 1),
        ...parentRule.rules.slice(part + 1)
      ]  
    }
  }
};

export const setTextNodeValue = (target: SlimTextNode, newValue: string): SlimTextNode => ({
  ...target,
  value: newValue
});

export const setElementAttribute = (target: SlimElement, name: string, value: string, index?: number): SlimElement => {
  let attributes: SlimElementAttribute[] = [];
  let foundIndex: number = -1;
  for (let i = 0, {length} = target.attributes; i < length; i++) {
    const attribute = target.attributes[i];
    if (attribute.name === name) {
      foundIndex = i;
      if (value) {
        attributes.push({ name, value });
      }
    } else {
      attributes.push(attribute);
    }
  }

  if (foundIndex === -1) {
    foundIndex = attributes.length;
    attributes.push({ name, value });
  }

  if (index != null && foundIndex !== index) {
    const attribute = attributes[foundIndex];
    attributes.splice(foundIndex, 1);
    attributes.splice(index, 0, attribute);
  }

  
  return {
    ...target,
    attributes,
  };
};

export const syncVMObjectSources = (to: VMObject, from: VMObject) => {
  to.source = from.source;
  if ((to as SlimParentNode).childNodes) {
    const children = (to as SlimParentNode).childNodes;
    for (let i = 0, {length} = children; i < length; i++) {
      syncVMObjectSources(children[i], (from as SlimParentNode).childNodes[i]);
    }
  }
  if ((to as SlimElement).shadow) {
    syncVMObjectSources((to as SlimElement).shadow, (from as SlimElement).shadow);
  }
  if ((to as SlimStyleElement).sheet) {
    syncVMObjectSources((to as SlimStyleElement).sheet, (from as SlimStyleElement).sheet);
  }
  if ((to as SlimCSSGroupingRule).rules) {
    const rules = (to as SlimCSSGroupingRule).rules;
    for (let i = 0, {length} = rules; i < length; i++) {
      syncVMObjectSources(rules[i], (from as SlimCSSGroupingRule).rules[i]);
    }
  }
}