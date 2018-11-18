
/* IMPORT */

import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import * as pify from 'pify';
import * as vscode from 'vscode';
import Config from './config';
import * as Fetchers from './fetchers';
import Utils from './utils';
import ViewProjectItem from './views/items/project';
import ViewGroupItem from './views/items/group';
const {fetchPathDescription, enhanceWithDescriptions, fetchProjectsFolders, fetchProjectsGitTower, AheadBehindGitCache, BranchGitCache, DirtyGitCache} = Fetchers; //FIXME: Importing them directly doesn't work for some reason

/* HELPERS */

function helperOpenProject ( project, inNewWindow: boolean = false ) {

  const {name, path} = project,
        absPath = Utils.path.untildify ( path ),
        rootPath = Utils.folder.getActiveRootPath (),
        isCurrent = absPath === rootPath;

  if ( isCurrent ) return vscode.window.showWarningMessage ( `"${name}" is already the opened project` );

  return Utils.folder.open ( absPath, inNewWindow );

}

function helperAddProjectToWorkspace ( project ) {

  const projectPath = Utils.path.untildify ( project.path ),
        insertInex = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0,
        uri = vscode.Uri.file ( projectPath );

  vscode.workspace.updateWorkspaceFolders( insertInex, null, {uri} );

}

async function helperOpenGroup ( group ) {

  const config = await Config.get (),
        isAllGroup = group.name === config.allGroupsName,
        parent = isAllGroup ? config : group,
        projects = Utils.config.getProjects ( parent );

  if ( !projects || !projects.length ) return vscode.window.showErrorMessage ( 'No projects to open' );

  const app = Utils.isInsiders () ? 'code-insiders' : 'code',
        firstProject = projects[0],
        firstProjectPath = Utils.path.untildify ( firstProject.path ),
        otherProjects = projects.slice ( 1 ),
        otherProjectsPaths = otherProjects.map ( project => Utils.path.untildify ( project.path ) );

  const commands = [
    `${app} "${firstProjectPath}"`,
    `${app} --add ${otherProjectsPaths.map ( path => `"${path}"` ).join ( ' ' )}`, //FIXME: It may not work (https://github.com/Microsoft/vscode/issues/38137) and can't be split up (https://github.com/Microsoft/vscode/issues/38138)
    'exit 0'
  ];

  const term = vscode.window.createTerminal ( 'Projects+ - Open Group' );

  commands.forEach ( command => term.sendText ( command, true ) );

}

/* COMMANDS */

async function initConfig () {

  const config = await Config.get ();
  const defaultConfig = {
    groups: [{
      name: 'Group',
      projects: [{
        name: 'Nested Project',
        description: "An awesome nested project",
        path: '/path/to/nested/project'
      }]
    }],
    projects: [{
      name: 'Project',
      description: 'An awesome project',
      path: '/path/to/project'
    }]
  };

  return Config.write ( config.configPath, defaultConfig );

}

async function editConfig () {

  const config = await Config.get (),
        hasFile = !!( await Utils.file.read ( config.configPath ) );

  if ( !hasFile ) await initConfig ();

  return Utils.file.open ( config.configPath );

}

async function open ( inNewWindow?, onlyGroups?, openAllProjects?, addToWorkSpace? ) {

  /* VARIABLES */

  const config = await Config.get (),
        configFiltered = onlyGroups ? config : Utils.config.filterByGroup ( config, config.group ),
        {items, projectsNr, groupsNr} = await Utils.ui.makeItems ( config, configFiltered, Utils.ui.makeQuickPickItem, 0, Infinity, onlyGroups );

  /* NO PROJECTS */

  if ( !projectsNr && ( !onlyGroups || !groupsNr ) ) {

    const option = await vscode.window.showErrorMessage ( 'No projects defined, refresh them or edit the configuration', { title: 'Refresh' }, { title: 'Edit' } ),
          action = option && option.title;

    switch ( action ) {
      case 'Refresh': return refresh ();
      case 'Edit': return editConfig ();
      default: return;
    }

  }

  /* QUICK PICK */

  const placeHolder = projectsNr
                        ? groupsNr
                            ? 'Select a project or a group...'
                            :  'Select a project...'
                        : 'Select a group...';

  const selected = await vscode.window.showQuickPick ( items, { placeHolder } );

  if ( !selected ) return;

  const {name, path} = selected.obj;

  if ( path ) { // Project

    if ( addToWorkSpace ) {

      return helperAddProjectToWorkspace ( selected.obj );

    } else {

      return helperOpenProject ( selected.obj, inNewWindow );

    }

  } else if ( openAllProjects ) { // All Projects in Group

    return helperOpenGroup ( selected.obj );

  } else { // Group

    // if ( name === config.group ) return vscode.window.showWarningMessage ( `"${name}" is already the active group` ); // Probably annoying, and it requires a bit more work to make it work with the `All Groups` special group

    return Utils.config.switchGroup ( config, name );

  }

}

async function openInNewWindow () {

  return open ( true );

}

async function openByName ( name, inNewWindow?, isGroup? ) {

  const config = await Config.get (),
        objCallback = obj => {
          if ( obj.name === name && !!obj.path === !isGroup ) found = obj;
        };

  let found;

  Utils.config.walk ( config, objCallback, _.noop, _.noop );

  if ( !found ) return;

  if ( isGroup ) {

    return Utils.config.switchGroup ( config, found.name );

  } else {

    return helperOpenProject ( found, inNewWindow );

  }

}

async function addToWorkspace () {

  return open ( false, false, false, true );

}

function refresh () { // In order to avoid race conditions

  Utils.singleExecution ( _refresh );

}

async function _refresh () {

  const config = await Config.get (),
        dataGitTower = await fetchProjectsGitTower (),
        dataGeneral = await fetchProjectsFolders ( config.refreshRoots, config.refreshDepth, config.refreshIgnoreFolders, ['.vscode', '.git', '.svn', '.hg'] ),
        data = [dataGitTower, dataGeneral],
        didFind = data.some ( config => !_.isEqual ( config, {} ) );

  if ( !didFind && !config.refreshRoots.length ) return vscode.window.showErrorMessage ( 'No projects found, add some paths to the "projects.refreshRoots" setting' );

  const configFile = await Config.getFile ( config.configPath ),
        configMerged = Config.merge ( {}, configFile, ...data ) as any,
        configEnhanced = await enhanceWithDescriptions ( configMerged );

  await Config.write ( config.configPath, configEnhanced );

  await AheadBehindGitCache.delete ();
  await BranchGitCache.delete ();
  await DirtyGitCache.delete ();

  return await open ();

}

async function remove () {

  const rootPath = Utils.folder.getActiveRootPath ();

  if ( !rootPath ) return vscode.window.showErrorMessage ( 'You have to open a project before removing it' );

  const config = await Config.get (),
        configFile = await Config.getFile ( config.configPath ),
        project = Utils.config.getProjectByPath ( config, rootPath );

  if ( !project ) return vscode.window.showErrorMessage ( 'This project has not been saved, yet' );

  const option = await vscode.window.showInformationMessage ( `Do you want to remove "${project.name}" from your projects?`, { title: 'Remove' } );

  if ( !option || option.title !== 'Remove' ) return;

  Utils.config.removeProject ( configFile, project );

  return Config.write ( config.configPath, configFile );

}

async function save () {

  /* ROOTPATH */

  const rootPath = Utils.folder.getActiveRootPath () as any;

  if ( !rootPath ) return vscode.window.showErrorMessage ( 'You have to open a project before saving it' );

  /* VARIABLES */

  const config = await Config.get (),
        configFile = await Config.getFile ( config.configPath ) || {},
        sameProject = Utils.config.getProjectByPath ( configFile, rootPath ),
        sameProjectGroup = sameProject ? Utils.config.getProjectGroup ( configFile, sameProject.path ) : undefined,
        nameHint = rootPath.substr ( rootPath.lastIndexOf ( path.sep ) + 1 ),
        descriptionHint = sameProject && sameProject.description ? sameProject.description : await fetchPathDescription ( rootPath ),
        groupHint = config.group || ( sameProjectGroup ? sameProjectGroup.name : undefined );

  /* NAME */

  const name = await vscode.window.showInputBox ({
    prompt: 'Project name',
    placeHolder: 'Type a name for your project',
    value: nameHint
  });

  if ( _.isUndefined ( name ) ) return;

  if ( !name ) return vscode.window.showWarningMessage ( 'You must provide a name for the project.' );

  /* DESCRIPTION */

  const description = await vscode.window.showInputBox ({
    prompt: 'Project description',
    placeHolder: 'Type a description for your project (optional)',
    value: descriptionHint
  });

  if ( _.isUndefined ( description ) ) return;

  /* GROUP */

  const groupName = await vscode.window.showInputBox ({
    prompt: 'Group name',
    placeHolder: 'Type the name of the group (optional)',
    value: groupHint
  });

  if ( _.isUndefined ( groupName ) ) return;

  const group = groupName ? Utils.config.getGroupByName ( configFile, groupName ) || Utils.config.addGroup ( configFile, groupName ) : configFile;

  /* PROJECTS */

  if ( !group.projects ) group.projects = [];

  const {projects} = group;

  /* PROJECT */

  const projectPath = config.useTilde ? Utils.path.tildify ( rootPath ) : rootPath,
        projectData = _.omitBy ( { name, description, path: projectPath }, _.isEmpty ) as any;

  if ( sameProject ) {

    _.extend ( sameProject, projectData );

    if ( sameProjectGroup && sameProjectGroup.name !== groupName ) {

      Utils.config.moveProject ( sameProject, sameProjectGroup, group );

    }

  } else {

    projects.push ( projectData );

  }

  /* SAVE */

  return Config.write ( config.configPath, configFile );

}

async function openGroup () {

  open ( undefined, true, true );

}

async function switchGroup () {

  open ( undefined, true );

}

/* VIEW COMMANDS */

function viewOpenProject ( Item: ViewProjectItem ) {

  return helperOpenProject ( Item.obj );

}

function viewOpenProjectInNewWindow ( Item: ViewProjectItem ) {

  return helperOpenProject ( Item.obj, true );

}

function viewAddProjectToWorkspace ( Item: ViewProjectItem ) {

  return helperAddProjectToWorkspace ( Item.obj );

}

async function viewOpenGroup ( Item: ViewGroupItem ) {

  return helperOpenGroup ( Item.obj );

}

async function viewSwitchGroup ( Item: ViewGroupItem ) {

  const config = await Config.get ();

  return Utils.config.switchGroup ( config, Item.obj.name );

}

/* EXPORT */

export {initConfig, editConfig, open, openInNewWindow, openByName, addToWorkspace, helperOpenProject, helperAddProjectToWorkspace, helperOpenGroup, refresh, remove, save, openGroup, switchGroup, viewOpenProject, viewOpenProjectInNewWindow, viewAddProjectToWorkspace, viewOpenGroup, viewSwitchGroup};
