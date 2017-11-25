
/* IMPORT */

import * as _ from 'lodash';
import * as JSON5 from 'json5';
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

  async getFile ( filePath ) {

    const content = await Utils.file.read ( filePath );

    if ( !content || !content.trim () ) return;

    const config: any = _.attempt ( JSON5.parse, content );

    if ( _.isError ( config ) ) {

      const option = await vscode.window.showErrorMessage ( '[Projects+] Your configuration file contains improperly formatted JSON', { title: 'Overwrite' }, { title: 'Edit' } );

      if ( option && option.title === 'Overwrite' ) {

        await Utils.file.write ( filePath, '{}' );

        return {};

      } else {

        if ( option && option.title === 'Edit' ) {

          Utils.file.open ( filePath );

        }

        throw new Error ( 'Can\'t read improperly formatted configuration file' );

      }

    }

    return config;

  },

  async get () {

    const defaults = Config.getDefaults (),
          extension: any = Config.getExtension (),
          configPath: string = extension.configPath || defaults.configPath,
          config = configPath && await Config.getFile ( configPath );

    return _.merge ( {}, defaults, extension, config );

  },

  async write ( filePath, config ) {

    const newConfig = _.omit ( config, ['configPath'] );

    await Utils.file.write ( filePath, JSON.stringify ( newConfig, undefined, 2 ) );

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
          const prevItem = prev.find ( prevItem => prevItem.name === nextItem.name ); //FIXME: Maybe check if they have the same path
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

      const pathNormalize = path => Utils.path.untildify ( path ).toLowerCase (),
            paths = Utils.config.getProjectsPaths ({ groups: merged.groups }).map ( pathNormalize );

      merged.projects = merged.projects.filter ( project => !_.includes ( paths, pathNormalize ( project.path ) ) );

    }

    /* RETURN */

    return merged;

  }

};

/* EXPORT */

export default Config;
