
/* IMPORT */

import * as _ from 'lodash';
import {exec} from 'child_process';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as os from 'os';
import * as path from 'path';
import * as pify from 'pify';
import * as vscode from 'vscode';
import Config from './config';
import * as Commands from './commands';
import {fetchBranchGeneralMulti} from './fetchers/branch/general';
import {fetchDirtyGeneralMulti} from './fetchers/dirty/general';
import ViewAll from './views/all';
import ViewProjectItem from './views/items/project';
import ViewGroupItem from './views/items/group';

/* UTILS */

const Utils = {

  initCommands ( context: vscode.ExtensionContext ) {

    /* CONTRIBUTIONS */

    const {commands} = vscode.extensions.getExtension ( 'fabiospampinato.vscode-projects-plus' ).packageJSON.contributes;

    commands.forEach ( ({ command, title }) => {

      const commandName = _.last ( command.split ( '.' ) ) as string,
            handler = Commands[commandName],
            proxy = commandName.startsWith ( 'view' ) ? handler : () => handler (), //FIXME: Ugly
            disposable = vscode.commands.registerCommand ( command, proxy );

      context.subscriptions.push ( disposable );

    });

    /* HARD CODED */

    ['projects.openProject', 'projects.openByName'].forEach ( command => {

      const commandName = _.last ( command.split ( '.' ) ) as string,
            handler = Commands[commandName],
            disposable = vscode.commands.registerCommand ( command, handler );

      context.subscriptions.push ( disposable );

    });

    return Commands;

  },

  initViews ( context: vscode.ExtensionContext ) {

    /* ALL */

    const viewAll = new ViewAll ();

    vscode.window.registerTreeDataProvider ( 'projects.views.all', viewAll );

    Utils.ui.views.push ( viewAll );

  },

  async exec ( command: string, options = {}, fallback? ) {

    try {

      return await pify ( exec )( command, options );

    } catch ( e ) {

      console.error ( e );

      return _.isUndefined ( fallback ) ? e : fallback;

    }

  },

  file: {

    open ( filepath, isTextDocument = true ) {

      filepath = path.normalize ( filepath );

      const fileuri = vscode.Uri.file ( filepath );

      if ( isTextDocument ) {

        return vscode.workspace.openTextDocument ( fileuri )
                               .then ( vscode.window.showTextDocument );

      } else {

        return vscode.commands.executeCommand ( 'vscode.open', fileuri );

      }

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

    async delete ( filepath ) {

      return pify ( fs.unlink )( filepath );

    },

    deleteSync ( filepath ) {

      return fs.unlinkSync ( filepath );

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

    },

    async delete ( filename ) {

      const filepath = Utils.cache.getFilePath ( filename );

      return Utils.file.delete ( filepath );

    }

  },

  folder: {

    open ( folderpath, inNewWindow? ) {

      folderpath = path.normalize ( folderpath );

      const folderuri = vscode.Uri.file ( folderpath );

      vscode.commands.executeCommand ( 'vscode.openFolder', folderuri, inNewWindow );

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

    walk ( obj, objCallback, groupCallback, projectCallback, sortGroups = Config.getExtension ().sortGroups, sortProjects = Config.getExtension ().sortProjects, _parent = false, depth = 0, groupsOnTop = Config.getExtension ().groupsOnTop ) { //FIXME: We should call `await Config.get ()`, but that's async and will break things

      const isGroupsOnTopValid = sortGroups && sortProjects,
            groups = obj.groups
                       ? sortGroups
                         ? _.sortBy ( obj.groups, group => group['name'].toLowerCase () )
                         : obj.groups
                       : [],
            projects = obj.projects
                         ? sortProjects
                           ? _.sortBy ( obj.projects, project => project['name'].toLowerCase () )
                           : obj.projects
                         : [],
            items = [];

      if ( groupsOnTop && isGroupsOnTopValid ) {

        items.push ( ...groups, ...projects );

      } else {

        items.push ( ..._.sortBy ( [...groups, ...projects], [item => item.name.toLowerCase ()] ) );

      }

      items.forEach ( item => {

        objCallback ( item, obj, depth );

        if ( item.path ) { // Project

          projectCallback ( item, obj, depth );

        } else {

          groupCallback ( item, obj, depth );

          Utils.config.walk ( item, objCallback, groupCallback, projectCallback, sortGroups, sortProjects, obj, depth + 1, groupsOnTop );

        }

      });

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

  icons: {

    toASCII ( str ) {

      const Oct2ASCII = {
        'arrow-small-right': '→',
        'cloud-upload': '↑',
        'alert': '△'
      };

      _.forOwn ( Oct2ASCII, ( ASCII, Oct ) => {

        str = str.replace ( `$(${Oct})`, ASCII );

      });

      return str;

    },

    strip ( str ) {

      return str.replace ( /\$\([^\)]+\)/gm, '' ).trim ();

    }

  },

  ui: {

    views: [],

    refresh () {

      Utils.ui.views.forEach ( view => view.refresh () );

    },

    refreshInterval ( interval ) {

      setInterval ( Utils.ui.refresh, interval );

    },

    async makeItems ( config, obj, itemMaker: Function, initialDepth = 0, maxDepth = Infinity, onlyGroups: boolean = false ) {

      /* VARIABLES */

      const items = [],
            {rootPath} = vscode.workspace,
            projects = Utils.config.getProjects ( obj ),
            projectsPaths = projects.map ( project => project.path ),
            dirtyData = ( config.checkDirty || config.filterDirty ) && !onlyGroups ? await fetchDirtyGeneralMulti ( projectsPaths ) : {},
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

        items.push ( itemMaker ( config, allGroups, 0 ) );

        groupsNr++;
        initialDepth++;
        maxDepth++;

      }

      /* ITEMS */

      Utils.config.walk ( obj, obj => {

        obj._iconsLeft = [];
        obj._iconsRight = [];

      }, ( group, parent, depth ) => {

        if ( depth > maxDepth ) return;

        if ( !group.name || !group.projects ) return;

        if ( config.activeIndicator && onlyGroups && activeGroup && activeGroup.name === group.name ) {

          group._iconsLeft.push ( 'arrow-small-right' );

        }

        items.push ( itemMaker ( config, group, initialDepth + depth ) );

        groupsNr++;

      }, ( project, parent, depth ) => {

        if ( depth > maxDepth ) return;

        if ( !project.name || !project.path || onlyGroups ) return;

        if ( config.filterDirty && !dirtyData[project.path] ) return;

        if ( config.filterRegex && !project.name.match ( new RegExp ( config.filterRegex ) ) ) return;

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

          if ( ( config.checkDirty || config.filterDirty ) && dirtyData[project.path] ) {

            project._iconsRight.push ( 'cloud-upload' );

          }

        }

        items.push ( itemMaker ( config, project, initialDepth + depth ) );

        projectsNr++;

      });

      return {items, projectsNr, groupsNr};

    },

    makeQuickPickItem ( config, obj, depth ) {

      const depthSpaces = _.repeat ( '\u00A0', config.indentationSpaces * depth ), // ' ' will be trimmed
            icon = obj.icon ? `$(${obj.icon}) ` : '',
            _iconsLeft = obj._iconsLeft ? obj._iconsLeft.map ( icon => `$(${icon}) ` ).join ( '' ) : '', //TODO: Make this public
            _iconsRight = obj._iconsRight ? obj._iconsRight.map ( icon => ` $(${icon})` ).join ( '' ) : '', //TODO: Make this public
            path = config.showPaths && obj.path,
            description = config.showDescriptions && obj.description,
            topDetail = config.invertPathAndDescription ? description : path,
            bottomDetail = config.invertPathAndDescription ? ( path ? `${depthSpaces}${path}` : '' ) : ( description ? `${depthSpaces}${description}` : '' );

      let name = `${depthSpaces}${_iconsLeft}${icon}${obj.name}${_iconsRight}`;

      if ( config.iconsASCII ) {

        name = Utils.icons.toASCII ( name );

      }

      return {
        obj,
        label: name,
        description: topDetail,
        detail: bottomDetail
      };

    },

    makeViewItem ( config, obj, depth ) {

      const icon = obj.icon ? `$(${obj.icon}) ` : '',
            _iconsLeft = obj._iconsLeft ? obj._iconsLeft.map ( icon => `$(${icon}) ` ).join ( '' ) : '', //TODO: Make this public
            _iconsRight = obj._iconsRight ? obj._iconsRight.map ( icon => ` $(${icon})` ).join ( '' ) : ''; //TODO: Make this public

      let name = `${_iconsLeft}${icon}${obj.name}${_iconsRight}`;

      if ( config.iconsASCII ) {

        name = Utils.icons.toASCII ( name );

      }

      name = Utils.icons.strip ( name ); //FIXME: Required because of https://github.com/Microsoft/vscode/issues/32956

      if ( obj.path ) { // Project

        const command = {
          title: 'open',
          tooltip: `Open ${obj.name}`,
          command: 'projects.openProject',
          arguments: [obj]
        };

        return new ViewProjectItem ( obj, name, command, vscode.TreeItemCollapsibleState.None );

      } else { // Group

        return new ViewGroupItem ( obj, obj.name );

      }

    }

  }

};

/* EXPORT */

export default Utils;
