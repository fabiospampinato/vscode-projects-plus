
/* IMPORT */

import * as _ from 'lodash';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import Utils from './utils';

/* CONFIG */

const Config = {

  getDefaults () {

    return {
      configPath: path.join ( os.homedir (), 'vscode_projects.json' )
    };

  },

  getExtension ( extension = 'projects' ) {

    const config = vscode.workspace.getConfiguration ().get ( extension ) as any;

    if ( !config['configPath'] ) delete config['configPath'];

    return config;

  },

  async getFile ( filepath ) {

    const file = await Utils.file.read ( filepath );

    if ( !file ) return;

    const config = _.attempt ( JSON.parse, file );

    if ( _.isError ( config ) ) return;

    return config;

  },

  async get () {

    const defaults = Config.getDefaults (),
          extension: any = Config.getExtension (),
          configPath: string = extension.configPath || defaults.configPath,
          config = configPath && await Config.getFile ( configPath );

    return _.merge ( {}, defaults, extension, config );

  },

  async write ( filepath, config ) {

    const newConfig = _.omit ( config, ['configPath'] );

    await Utils.file.write ( filepath, JSON.stringify ( newConfig, undefined, 2 ) );

    const {default: Statusbar} = require ( './statusbar' ); // In order to avoid cyclic dependency

    Statusbar.update ();
    Utils.ui.refresh ();

  },

  merge ( config, ...otherConfigs ) {

    /* ROUGH MERGE */ // Based on the assumpion that all arrays are either groups or projects

    function roughMerge ( config, ...otherConfigs ) {
      return _.mergeWith ( config, ...otherConfigs, ( prev, next ) => {
        if ( !_.isArray ( prev ) || !_.isArray ( next ) ) return;
        next.forEach ( nextItem => {
          const prevItem = prev.find ( prevItem => prevItem.name === nextItem.name );
          if ( !prevItem ) {
            prev.push ( nextItem );
          } else {
            roughMerge ( prevItem, nextItem );
          }
        });
        return prev;
      });
    }

    const merged = roughMerge ( config, ...otherConfigs ) as any;

    /* REMOVE UNGROUPED DUPLICATES */

    if ( merged.groups && merged.projects ) {

      const paths = Utils.config.getProjectsPaths ({ groups: merged.groups });

      merged.projects = merged.projects.filter ( project => !_.includes ( paths, project.path ) );

    }

    /* RETURN */

    return merged;

  }

};

/* EXPORT */

export default Config;
