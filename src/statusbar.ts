
/* IMPORT */

import * as _ from 'lodash';
import * as vscode from 'vscode';
import Config from './config';
import Utils from './utils';

/* STATUSBAR */

class Statusbar {

  item; itemProps; config; rootPath; project; group; _updateDebounced;

  constructor () {

    this.item = this._initItem ();
    this.itemProps = {};
    this._updateDebounced = _.debounce ( this.update.bind ( this ), 100 );

    vscode.workspace.onDidChangeConfiguration ( () => this._updateDebounced () );
    vscode.window.onDidChangeActiveTextEditor ( () => this._updateDebounced () );

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

  _setItemProp ( prop, value, _set = true ) {

    if ( this.itemProps[prop] === value ) return false;

    this.itemProps[prop] = value;

    if ( _set ) {

      this.item[prop] = value;

    }

    return true;

  }

  async update ( config? ) {

    this.config = config || await Config.get ();

    this.updateVariables ();
    this.updateColor ();
    this.updateCommand ();
    this.updateTooltip ();
    this.updateText ();
    this.updateVisibility ();

  }

  updateVariables () {

    this.rootPath = Utils.folder.getActiveRootPath ();
    this.project = this.rootPath && Utils.config.getProjectByPath ( this.config, this.rootPath );
    this.group = this.project && Utils.config.getProjectGroup ( this.config, this.rootPath );

  }

  updateColor () {

    const color = this.config.statusbarColor;

    this._setItemProp ( 'color', color );

  }

  updateCommand () {

    const command = this.config.statusbarCommand;

    this._setItemProp ( 'command', command );

  }

  updateTooltip () {

    const tooltip = this.rootPath || 'No project opened';

    this._setItemProp ( 'tooltip', tooltip );

  }

  updateText () {

    let template = this._getTemplate ();

    if ( this.group ) template = template.replace ( /\[group\]/ig, this.group.name );

    template = template.replace ( /\[project\]/ig, this.project ? this.project.name : 'No project' );

    this._setItemProp ( 'text', template );

  }

  updateVisibility () {

    const visibility = !!this.config.statusbarEnabled;

    if ( this._setItemProp ( 'visibility', visibility ) ) {

      this.item[visibility ? 'show' : 'hide']();

    }

  }

}

/* EXPORT */

const statusbar = new Statusbar ();

export default statusbar;
