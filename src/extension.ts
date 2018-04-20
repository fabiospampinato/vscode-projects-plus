
/* IMPORT */

import * as vscode from 'vscode';
import './statusbar';
import Config from './config';
import Utils from './utils';

/* ACTIVATE */

async function activate ( context: vscode.ExtensionContext ) {

  const config = await Config.get ();

  Utils.initViews ( context );

  return Utils.initCommands ( context );

}

/* EXPORT */

export {activate};
