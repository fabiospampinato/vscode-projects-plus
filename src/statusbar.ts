
/* IMPORT */

import * as vscode from 'vscode';
import Config from './config';
import Utils from './utils';

/* STATUSBAR */

class Statusbar {

  item; config; rootPath; project; group;

  constructor () {

    this.item = this._initItem ();

    vscode.workspace.onDidChangeConfiguration ( this.update.bind ( this ) );

    this.update ();

  }

  _initItem () {

    const config = Config.getExtension (),
          alignment = config.statusbarAlignment === "right" ? vscode.StatusBarAlignment.Right : vscode.StatusBarAlignment.Left,
          priority = config.statusbarPriority;

    return vscode.window.createStatusBarItem ( alignment, priority );

  }

  _getTemplate () {

    let template = this.config.statusbarTemplate;

    if ( !this.group && template.includes ( '[group]' ) ) {

      const matches = template.match ( /^(.*)\[group\].*(\[project\].*)$/i ); // So that we are able to remove eventual icons between them

      if ( matches ) {

        template = matches[1] + matches[2];

      } else {

        template = template.replace ( /\[group\]/ig, template.includes ( '[project]' ) ? '' : '[project]' );

      }

      template = template.replace ( /\s+/, ' ' );

    }

    return template;

  }

  async update ( config? ) {

    this.config = config || await Config.get ();

    this.updateVariables ();
    this.updateCommand ();
    this.updateTooltip ();
    this.updateText ();
    this.updateVisibility ();

  }

  updateVariables () {

    this.rootPath = vscode.workspace.rootPath;
    this.project = this.rootPath && Utils.config.getProjectByPath ( this.config, this.rootPath );
    this.group = this.project && Utils.config.getProjectGroup ( this.config, this.rootPath );

  }

  updateCommand () {

    this.item.command = this.config.statusbarCommand;

  }

  updateTooltip () {

    this.item.tooltip = this.rootPath || 'No project opened';

  }

  updateText () {

    let text = this._getTemplate ();

    if ( this.group ) text = text.replace ( /\[group\]/ig, this.group.name );

    text = text.replace ( /\[project\]/ig, this.project ? this.project.name : 'No project' );

    this.item.text = text;

  }

  updateVisibility () {

    const isEnabled = !!this.config.statusbarEnabled;

    this.item[isEnabled ? 'show' : 'hide']();

  }

}

/* EXPORT */

const statusbar = new Statusbar ();

export default statusbar;
