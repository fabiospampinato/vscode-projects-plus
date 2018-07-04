
/* IMPORT */

import * as _ from 'lodash';
import * as fs from 'fs';
import * as os from 'os';
import * as plist from 'plist';
import Config from '../../config';
import Utils from '../../utils';

/* VARIABLES */

const BOOKMARKS_PATHS = [
  `${os.homedir ()}/Library/Application\ Support/com.fournova.Tower2/bookmarks-v2.plist`,
  `${os.homedir ()}/Library/Application\ Support/com.fournova.Tower3/bookmarks-v2.plist`
];

/* GIT TOWER */

async function fetchProjectsGitTower () {

  if ( !/darwin/.test ( process.platform ) ) return; //TODO: Add Windows support

  async function getFile () {

    let mtime = new Date ( 0 ),
        content;

    for ( let filePath of BOOKMARKS_PATHS ) {

      const stat = await Utils.file.stat ( filePath );

      if ( !stat || stat.mtime.getTime () <= mtime.getTime () ) continue;

      mtime = stat.mtime;

      content = await Utils.file.read ( filePath );

    }

    return content;

  }

  const file = await getFile ();

  if ( !file ) return {};

  const bookmarks = plist.parse ( file ),
        config = await Config.get (),
        found: any = {};

  function parseGroup ( obj, parent ) {

    if ( !parent.groups ) parent.groups = [];

    const group = {
      name: obj.name
    };

    parent.groups.push ( group );

    return group;

  }

  function parseRepository ( obj, parent ) {

    if ( !parent.projects ) parent.projects = [];

    const folderPath = _.trimEnd ( obj.fileURL.replace ( 'file://', '' ), '/' ),
          projectPath = config.useTilde ? Utils.path.tildify ( folderPath ) : folderPath,
          project = {
            name: obj.name,
            path: projectPath
          };

    parent.projects.push ( project );

    return project;

  }

  function parseObj ( obj, parent ) {

    const parsers = {
      1: parseGroup,
      2: parseRepository
    };

    let newParent = parent;

    if ( parsers[obj.type] ) {

      newParent = parsers[obj.type]( obj, parent );

    }

    if ( obj.children ) {

      obj.children.forEach ( child => parseObj ( child, newParent ) );

    }

  }

  parseObj ( bookmarks, found );

  return found;

}

/* EXPORT */

export {fetchProjectsGitTower};
