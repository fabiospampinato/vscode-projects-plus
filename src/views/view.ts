
/* IMPORT */

import * as vscode from 'vscode';
import Item from './items/item';

/* VIEW */

class View implements vscode.TreeDataProvider<Item> {

  onDidChangeTreeDataEvent = new vscode.EventEmitter<Item | undefined> ();
  onDidChangeTreeData = this.onDidChangeTreeDataEvent.event;

  getTreeItem ( item: Item ): vscode.TreeItem {

    return item;

  }

  async getChildren ( item?: Item ): Promise<Item[]> {

    return [];

  }

  refresh () {

    this.onDidChangeTreeDataEvent.fire ();

  }

}

/* EXPORT */

export default View;
