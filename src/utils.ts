
/* IMPORT */

import * as _ from 'lodash';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as os from 'os';
import * as path from 'path';
import * as pify from 'pify';
import * as vscode from 'vscode';
import * as Commands from './commands';
import {fetchBranchGeneralMulti} from './fetchers/branch/general';
import {fetchDirtyGeneralMulti} from './fetchers/dirty/general';

/* UTILS */

const Utils = {

  initCommands ( context: vscode.ExtensionContext ) {

    const {commands} = vscode.extensions.getExtension ( 'fabiospampinato.vscode-projects-plus' ).packageJSON.contributes;

    commands.forEach ( ({ command, title }) => {

      const commandName = _.last ( command.split ( '.' ) ) as string,
            handler = Commands[commandName],
            disposable = vscode.commands.registerCommand ( command, () => handler () );

      context.subscriptions.push ( disposable );

    });

    return Commands;

  },

  file: {

    open ( filepath ) {

      return vscode.commands.executeCommand ( 'vscode.open', vscode.Uri.parse ( `file://${filepath}` ) );

    },

    async make ( filepath, content ) {

      await pify ( mkdirp )( path.dirname ( filepath ) );

      return Utils.file.write ( filepath, content );

    },

    async read ( filepath ) {

      try {
        return ( await pify ( fs.readFile )( filepath, { encoding: 'utf8' } ) ).toString ();
      } catch ( e ) {
        return;
      }

    },

    readSync ( filepath ) {

      try {
        return ( fs.readFileSync ( filepath, { encoding: 'utf8' } ) ).toString ();
      } catch ( e ) {
        return;
      }

    },

    async write ( filepath, content ) {

      return pify ( fs.writeFile )( filepath, content, {} );

    },

    async stat ( filepath ) {

      try {
        return await pify ( fs.stat )( filepath );
      } catch ( e ) {
        return;
      }

    }

  },

  cache: {

    getFilePath ( filename ) {

      return path.join ( os.tmpdir (), filename );

    },

    async read ( filename, fallback = {} ) {

      const filepath = Utils.cache.getFilePath ( filename ),
            content = await Utils.file.read ( filepath );

      if ( !content ) return fallback;

      const parsed = _.attempt ( JSON.parse, content );

      if ( _.isError ( parsed ) ) return fallback;

      return parsed;

    },

    async write ( filename, content = {} ) {

      const filepath = Utils.cache.getFilePath ( filename );

      return Utils.file.write ( filepath, JSON.stringify ( content, undefined, 2 ) );

    }

  },

  folder: {

    open ( folderpath, inNewWindow? ) {

      vscode.commands.executeCommand ( 'vscode.openFolder', vscode.Uri.parse ( `file://${folderpath}` ), inNewWindow );

    },

    exists ( folderpath ) {

      try {
        fs.accessSync ( folderpath );
        return true;
      } catch ( e ) {
        return false;
      }

    }

  },

  config: {

    /* CONFIG */

    walk ( obj, objCallback, groupCallback, projectCallback, sortGroups = true, sortProjects = true, _parent = false, depth = 0 ) {

      if ( obj.groups ) { // Running it now ensures that groups are always on top

        const groups = sortGroups ? _.sortBy ( obj.groups, 'name' ) : obj.groups;

        groups.forEach ( group => {

          objCallback ( group, groups, depth );

          groupCallback ( group, groups, depth );

          Utils.config.walk ( group, objCallback, groupCallback, projectCallback, sortGroups, sortProjects, group, depth + 1 );

        });

      }

      if ( obj.projects ) {

        const projects = sortProjects ? _.sortBy ( obj.projects, 'name' ) : obj.projects;

        projects.forEach ( project => {

          objCallback ( project, obj, depth );

          projectCallback ( project, obj, depth );

        });

      }

    },

    filterByGroup ( config, group ) {

      if ( !config.groups || !group ) return config;

      const activeGroup = Utils.config.getGroupByName ( config, group );

      if ( !activeGroup || !activeGroup.projects ) return config;

      return _.extend ( _.omit ( config, ['groups', 'projects'] ), _.pick ( activeGroup, ['groups', 'projects'] ) );

    },

    /* GROUPS */

    addGroup ( obj, name, projects? ) { //TODO: Add support for nested groups

      if ( !obj.groups ) obj.groups = [];

      const group: any = {name};

      if ( projects ) group.projects = projects;

      obj.groups.push ( group );

      return group;

    },

    async switchGroup ( config, groupName ) {

      const Config = require ( './config' ).default, // Can't import it normally or it will cause a circular dependency
            configFile = await Config.getFile ( config.configPath ),
            group = Utils.config.getGroupByName ( configFile, groupName );

      if ( !group ) {

        delete configFile.group;

      } else {

        configFile.group = groupName;

      }

      return Config.write ( config.configPath, configFile );

    },

    walkGroups ( obj, callback, sortGroups? ) {

      Utils.config.walk ( obj, _.noop, callback, _.noop, sortGroups );

    },

    getGroups ( obj ) {

      const groups = [];

      Utils.config.walkGroups ( obj, group => groups.push ( group ) );

      return groups;

    },

    getGroupsNames ( obj ) {

      return Utils.config.getGroups ( obj ).map ( group => group.name );

    },

    getGroupByName ( obj, name ) { //TODO: Add support for nested groups with the same name

      return Utils.config.getGroups ( obj ).find ( group => group.name === name );

    },

    /* PROJECTS */

    walkProjects ( obj, callback, sortProjects? ) {

      Utils.config.walk ( obj, _.noop, _.noop, callback, undefined, sortProjects );

    },

    getProjects ( obj ) {

      const projects = [];

      Utils.config.walkProjects ( obj, project => projects.push ( project ) );

      return projects;

    },

    getProjectsPaths ( obj ) {

      return Utils.config.getProjects ( obj ).map ( project => project.path );

    },

    moveProject ( project, prevGroup, nextGroup ) {

      Utils.config.removeProjectFromGroup ( project, prevGroup );

      if ( !nextGroup.projects ) nextGroup.projects = [];

      nextGroup.projects.push ( project );

    },

    removeProjectFromGroup ( project, group ) {

      group.projects = group.projects.filter ( otherProject => otherProject.path !== project.path );

    },

    removeProject ( config, project ) {

      if ( config.projects ) {

        Utils.config.removeProjectFromGroup ( project, config );

      }

      const group = Utils.config.getProjectGroup ( config, project.path );

      if ( group ) {

        Utils.config.removeProjectFromGroup ( project, group );

      }

    },

    getProjectGroup ( config, path ) {

      return Utils.config.getGroups ( config ).find ( group => Utils.config.getProjectByPath ( { projects: group.projects }, path ) );

    },

    getProjectByPath ( obj, path ) {

      return Utils.config.getProjects ( obj ).find ( project => project.path === path );

    }

  },

  quickPick: {

    makeItem ( config, obj, depth ) {

      const depthSpaces = _.repeat ( '\u00A0', config.indentationSpaces * depth ), // ' ' will be trimmed
            icon = obj.icon ? `$(${obj.icon}) ` : '',
            _iconsLeft = obj._iconsLeft ? obj._iconsLeft.map ( icon => `$(${icon}) ` ).join ( '' ) : '', //TODO: Make this public
            _iconsRight = obj._iconsRight ? obj._iconsRight.map ( icon => ` $(${icon})` ).join ( '' ) : '', //TODO: Make this public
            name = `${depthSpaces}${_iconsLeft}${icon}${obj.name}${_iconsRight}`,
            path = config.showPaths && obj.path,
            description = config.showDescriptions && obj.description,
            topDetail = config.invertPathAndDescription ? description : path,
            bottomDetail = config.invertPathAndDescription ? ( path ? `${depthSpaces}${path}` : '' ) : ( description ? `${depthSpaces}${description}` : '' );

      return {
        obj,
        label: name,
        description: topDetail,
        detail: bottomDetail
      };

    },

    async makeItems ( config, obj, initialDepth, onlyGroups? ) {

      /* VARIABLES */

      const items = [],
            {rootPath} = vscode.workspace,
            projects = Utils.config.getProjects ( obj ),
            projectsPaths = projects.map ( project => project.path ),
            dirtyData = config.checkDirty && !onlyGroups ? await fetchDirtyGeneralMulti ( projectsPaths ) : {},
            branchData = config.showBranch && !onlyGroups ? await fetchBranchGeneralMulti ( projectsPaths ) : {},
            activeGroup = config.group && Utils.config.getGroupByName ( config, config.group ),
            activeProject = rootPath ? Utils.config.getProjectByPath ( config, rootPath ) : false;

      let projectsNr = 0,
          groupsNr = 0;

      /* ALL GROUPS */

      if ( onlyGroups ) {

        const allGroups: any = {
          name: config.allGroupsName
        };

        if ( config.activeIndicator && !activeGroup ) {

          allGroups._iconsLeft = ['arrow-small-right'];

        }

        items.push ( Utils.quickPick.makeItem ( config, allGroups, 0 ) );

        groupsNr++;
        initialDepth++;

      }

      /* ITEMS */

      Utils.config.walk ( obj, obj => {

        obj._iconsLeft = [];
        obj._iconsRight = [];

      }, ( group, parent, depth ) => {

        if ( !group.name || !group.projects ) return;

        if ( config.activeIndicator && onlyGroups && activeGroup && activeGroup.name === group.name ) {

          group._iconsLeft.push ( 'arrow-small-right' );

        }

        items.push ( Utils.quickPick.makeItem ( config, group, initialDepth + depth ) );

        groupsNr++;

      }, ( project, parent, depth ) => {

        if ( !project.name || !project.path || onlyGroups ) return;

        if ( config.checkPaths && !Utils.folder.exists ( project.path ) ) {

          project._iconsRight.push ( 'alert' );

        } else {

          if ( config.showBranch && !onlyGroups ) {

            const branch = branchData[project.path];

            if ( branch && !_.includes ( config.ignoreBranches, branchData[project.path] ) ) {

              project.name += `/${branch}`;

            }

          }

          if ( config.activeIndicator && !onlyGroups && activeProject && activeProject.path === project.path ) {

            project._iconsLeft.push ( 'arrow-small-right' );

          }

          if ( config.checkDirty && dirtyData[project.path] ) {

            project._iconsRight.push ( 'cloud-upload' );

          }

        }

        items.push ( Utils.quickPick.makeItem ( config, project, initialDepth + depth ) );

        projectsNr++;

      });

      return {items, projectsNr, groupsNr};

    }

  }

};

/* EXPORT */

export default Utils;
