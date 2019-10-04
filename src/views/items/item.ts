
/* IMPORT */

import * as vscode from 'vscode';

/* ITEM */

class Item extends vscode.TreeItem {

  obj;

  contextValue = 'item';

  constructor (
    obj,
    label: string,
    command?: vscode.Command,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Expanded,
    description?: string,
  ) {

    super ( label, collapsibleState );

    this.obj = obj;
    this.command = command;
    this.tooltip = obj.description;
    this.description = description;

  }

}

/* EXPORT */

export default Item;
