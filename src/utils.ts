
/* IMPORT */

import * as _ from 'lodash';
import * as absolute from 'absolute';
import {exec} from 'child_process';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as os from 'os';
import * as path from 'path';
import * as pify from 'pify';
import * as tildify from 'tildify';
import * as untildify from 'untildify';
import * as vscode from 'vscode';
import Config from './config';
import * as Commands from './commands';
import {fetchAheadBehindGeneralMulti} from './fetchers/ahead_behind/general';
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

    ['projects.helperOpenProject', 'helperAddProjectToWorkspace', 'projects.helperOpenGroup', 'projects.openByName'].forEach ( command => {

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

    vscode.window.registerTreeDataProvider ( 'projects.views.explorer.all', viewAll );
    vscode.window.registerTreeDataProvider ( 'projects.views.activity_bar.all', viewAll );

    Utils.ui.views.push ( viewAll );

    /* REFRESH */

    if ( Utils.ui.views.length ) {

      Config.onChange ( Utils.ui.refresh );

    }

  },

  isInsiders () {

    return !!vscode.env.appName.match ( /insiders/i );

  },

  async exec ( command: string, options = {}, fallback? ) {

    try {

      return await pify ( exec )( command, options );

    } catch ( e ) {

      console.error ( e );

      return _.isUndefined ( fallback ) ? e : fallback;

    }

  },

  async singleExecution ( callback, ...args ) { // Avoids running the callback multiple times simultaneously

    if ( callback.__executing ) return;

    callback.__executing = true;

    try {

      return await callback ( ...args );

    } finally {

      callback.__executing = false;

    }

  },

  path: {

    tildify: _.memoize ( tildify ),

    untildify: _.memoize ( untildify )

  },

  file: {

    open ( filePath, isTextDocument = true ) {

      filePath = path.normalize ( filePath );

      const fileuri = vscode.Uri.file ( filePath );

      if ( isTextDocument ) {

        return vscode.workspace.openTextDocument ( fileuri )
                               .then ( doc => vscode.window.showTextDocument ( doc, { preview: false } ) );

      } else {

        return vscode.commands.executeCommand ( 'vscode.open', fileuri );

      }

    },

    async make ( filePath, content ) {

      await pify ( mkdirp )( path.dirname ( filePath ) );

      return Utils.file.write ( filePath, content );

    },

    async read ( filePath ) {

      try {
        return ( await pify ( fs.readFile )( filePath, { encoding: 'utf8' } ) ).toString ();
      } catch ( e ) {
        return;
      }

    },

    readSync ( filePath ) {

      try {
        return ( fs.readFileSync ( filePath, { encoding: 'utf8' } ) ).toString ();
      } catch ( e ) {
        return;
      }

    },

    async write ( filePath, content ) {

      return pify ( fs.writeFile )( filePath, content, {} );

    },

    async delete ( filePath ) {

      return pify ( fs.unlink )( filePath );

    },

    deleteSync ( filePath ) {

      return fs.unlinkSync ( filePath );

    },

    async stat ( filePath ) {

      try {
        return await pify ( fs.stat )( filePath );
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

      const filePath = Utils.cache.getFilePath ( filename ),
            content = await Utils.file.read ( filePath );

      if ( !content ) return fallback;

      const parsed = _.attempt ( JSON.parse, content );

      if ( _.isError ( parsed ) ) return fallback;

      return parsed;

    },

    async write ( filename, content = {} ) {

      const filePath = Utils.cache.getFilePath ( filename );

      return Utils.file.write ( filePath, JSON.stringify ( content, undefined, 2 ) );

    },

    async delete ( filename ) {

      const filePath = Utils.cache.getFilePath ( filename );

      try { // It may not exist anymore
        await Utils.file.delete ( filePath );
      } catch ( e ) {}

    }

  },

  folder: {

    open ( folderPath, inNewWindow? ) {

      folderPath = path.normalize ( folderPath );

      const folderuri = vscode.Uri.file ( folderPath );

      vscode.commands.executeCommand ( 'vscode.openFolder', folderuri, inNewWindow );

    },

    exists ( folderPath ) {

      try {
        fs.accessSync ( folderPath );
        return true;
      } catch ( e ) {
        return false;
      }

    },

    getRootPath ( basePath? ) {

      const {workspaceFolders} = vscode.workspace;

      if ( !workspaceFolders ) return;

      const firstRootPath = workspaceFolders[0].uri.fsPath;

      if ( !basePath || !absolute ( basePath ) ) return firstRootPath;

      const rootPaths = workspaceFolders.map ( folder => folder.uri.fsPath ),
            sortedRootPaths = _.sortBy ( rootPaths, [path => path.length] ).reverse (); // In order to get the closest root

      return sortedRootPaths.find ( rootPath => basePath.startsWith ( rootPath ) );

    },

    getActiveRootPath () {

      const {activeTextEditor} = vscode.window,
            editorPath = activeTextEditor && activeTextEditor.document.uri.fsPath;

      return Utils.folder.getRootPath ( editorPath );

    }

  },

  config: {

    /* CONFIG */

    walk ( obj, objCallback, groupCallback, projectCallback, sortGroups = Config.getExtension ().sortGroups, sortProjects = Config.getExtension ().sortProjects, _parent = false, depth = 0, groupsOnTop = Config.getExtension ().groupsOnTop ) { //FIXME: We should call `await Config.get ()`, but that's async and will break things

      groupsOnTop = groupsOnTop || !sortGroups || !sortProjects;

      const groups = obj.groups
                       ? groupsOnTop && sortGroups
                         ? _.sortBy ( obj.groups, group => group['name'].toLowerCase () )
                         : obj.groups
                       : [],
            projects = obj.projects
                         ? groupsOnTop && sortProjects
                           ? _.sortBy ( obj.projects, project => project['name'].toLowerCase () )
                           : obj.projects
                         : [],
            items = [];

      if ( groupsOnTop ) {

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

      const projectPath = Utils.path.untildify ( project.path );

      group.projects = group.projects.filter ( otherProject => Utils.path.untildify ( otherProject.path ) !== projectPath );

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

      path = vscode.Uri.parse ( Utils.path.untildify ( path ) ).fsPath;

      return Utils.config.getProjects ( obj ).find ( project => vscode.Uri.parse ( Utils.path.untildify ( project.path ) ).fsPath === path );

    }

  },

  icons: {

    ASCII: {
      arrow_up: '↑',
      arrow_right: '→',
      arrow_down: '↓',
      arrow_left: '←',
      dirty: '✴',
      warning: '△'
    },

    Octicons: {
      arrow_up: '$(arrow-small-up)',
      arrow_right: '$(arrow-small-right)',
      arrow_down: '$(arrow-small-down)',
      arrow_left: '$(arrow-small-left)',
      dirty: '$(diff-modified)',
      warning: '$(alert)'
    }

  },

  ui: {

    views: [],

    refresh () {

      Utils.ui.views.forEach ( view => view.refresh () );

    },

    async makeItems ( config, obj, itemMaker: Function, initialDepth = 0, maxDepth = Infinity, onlyGroups: boolean = false ) {

      /* VARIABLES */

      const items = [],
            icons = config.iconsASCII || ( itemMaker === Utils.ui.makeViewItem ) ? Utils.icons.ASCII : Utils.icons.Octicons,
            rootPath = Utils.folder.getActiveRootPath (),
            projects = Utils.config.getProjects ( obj ),
            projectsPaths = projects.map ( project => project.path ),
            dirtyData = ( config.checkDirty || config.filterDirty ) && !onlyGroups ? await fetchDirtyGeneralMulti ( projectsPaths ) : {},
            aheadBehindData = config.showAheadBehind && !onlyGroups ? await fetchAheadBehindGeneralMulti ( projectsPaths ) : {},
            branchData = config.showBranch && !onlyGroups ? await fetchBranchGeneralMulti ( projectsPaths ) : {},
            activeGroup = config.group && Utils.config.getGroupByName ( config, config.group ),
            activeProject = rootPath ? Utils.config.getProjectByPath ( config, rootPath ) : false,
            activeProjectPath = activeProject ? Utils.path.untildify ( activeProject.path ) : false;

      let projectsNr = 0,
          groupsNr = 0;

      /* ALL GROUPS */

      if ( onlyGroups ) {

        const allGroups: any = {
          name: config.allGroupsName,
          _iconsLeft: [],
          _iconsRight: []
        };

        if ( config.activeIndicator && !activeGroup ) {

          allGroups._iconsLeft.push ( icons.arrow_right );

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

          group._iconsLeft.push ( icons.arrow_right );

        }

        items.push ( itemMaker ( config, group, initialDepth + depth ) );

        groupsNr++;

      }, ( project, parent, depth ) => {

        if ( depth > maxDepth ) return;

        if ( !project.name || !project.path || onlyGroups ) return;

        if ( config.filterDirty && !dirtyData[project.path] ) return;

        if ( config.filterRegex && !project.name.match ( new RegExp ( config.filterRegex ) ) ) return;

        if ( config.checkPaths && !Utils.folder.exists ( Utils.path.untildify ( project.path ) ) ) {

          project._iconsRight.push ( icons.warning );

        } else {

          if ( config.showBranch && !onlyGroups ) {

            const branch = branchData[project.path];

            if ( branch && !_.includes ( config.ignoreBranches, branch ) ) {

              project.name += `/${branch}`;

            }

          }

          if ( config.activeIndicator && !onlyGroups && activeProject && activeProjectPath === Utils.path.untildify ( project.path ) ) {

            project._iconsLeft.push ( icons.arrow_right );

          }

          if ( ( config.checkDirty || config.filterDirty ) && dirtyData[project.path] ) {

            project._iconsRight.push ( icons.dirty );

          }

          if ( config.showAheadBehind && !onlyGroups && aheadBehindData[project.path] ) {

            const {ahead, behind} = aheadBehindData[project.path];

            if ( ahead ) project._iconsRight.push ( `${icons.arrow_up}${ahead}` );
            if ( behind ) project._iconsRight.push ( `${icons.arrow_down}${behind}` );

          }

        }

        items.push ( itemMaker ( config, project, initialDepth + depth ) );

        projectsNr++;

      });

      return {items, projectsNr, groupsNr};

    },

    makeQuickPickItem ( config, obj, depth ) {

      const depthSpaces = _.repeat ( '\u00A0', config.indentationSpaces * depth ), // ' ' will be trimmed
            icons = config.iconsASCII ? Utils.icons.ASCII : Utils.icons.Octicons,
            icon = obj.icon ? ( icons[obj.icon] ? `${icons[obj.icon]} ` : `$(${obj.icon}) ` ) : '',
            _iconsLeft = obj._iconsLeft ? `${obj._iconsLeft.join ( ' ' )} ` : '', //TODO: Make this public
            _iconsRight = obj._iconsRight ? ` ${obj._iconsRight.join ( ' ' )}` : '', //TODO: Make this public
            path = config.showPaths && obj.path,
            description = config.showDescriptions && obj.description,
            topDetail = config.invertPathAndDescription ? description : path,
            bottomDetail = config.invertPathAndDescription ? ( path ? `${depthSpaces}${path}` : '' ) : ( description ? `${depthSpaces}${description}` : '' ),
            name = `${depthSpaces}${_iconsLeft}${icon}${obj.name}${_iconsRight}`;

      return {
        obj,
        label: name,
        description: topDetail,
        detail: bottomDetail
      };

    },

    makeViewItem ( config, obj, depth ) {

      const icon = obj.icon ? ( Utils.icons.ASCII[obj.icon] ? `${Utils.icons.ASCII[obj.icon]} ` : '' ) : '',
            _iconsLeft = obj._iconsLeft ? `${obj._iconsLeft.join ( ' ' )} ` : '', //TODO: Make this public
            _iconsRight = obj._iconsRight ? ` ${obj._iconsRight.join ( ' ' )}` : '', //TODO: Make this public
            name = `${_iconsLeft}${icon}${obj.name}${_iconsRight}`;

      if ( obj.path ) { // Project

        const command = {
          title: 'open',
          tooltip: `Open ${obj.name}`,
          command: 'projects.helperOpenProject',
          arguments: [obj, config.viewOpenInNewWindow]
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
