
/* IMPORT */

import * as _ from 'lodash';
import * as  fs from 'fs';
import * as path from 'path';
import Utils from '../../utils';

/* GIT CACHE */

let cache;

const DirtyGitCache = {

  filename: '.vscode-projects-plus_dirty-git-cache.json',

  read () {
    return Utils.cache.read ( DirtyGitCache.filename );
  },

  write ( content ) {
    return Utils.cache.write ( DirtyGitCache.filename, content );
  },

  delete () {
    cache = undefined;
    return Utils.cache.delete ( DirtyGitCache.filename );
  }

};

/* GIT */

async function fetchDirtyGit ( folderPath, updateCache = true ) {

  let returnVal;

  const absFolderPath = Utils.path.untildify ( folderPath ),
        gitPath = path.join ( absFolderPath, '.git' ),
        stat = await Utils.file.stat ( gitPath );

  if ( stat ) {

    if ( !cache ) cache = await DirtyGitCache.read ();

    if ( cache[absFolderPath] && !_.isNull ( cache[absFolderPath].dirty ) && cache[absFolderPath].timestamp >= new Date ( stat.mtime ).getTime () ) {

      returnVal = cache[absFolderPath].dirty;

    } else {

      const command = 'git status --porcelain --untracked-files',
            commandOptions = {
              cwd: absFolderPath,
              encoding: 'utf8'
            },
            result = await Utils.exec ( command, commandOptions, null ),
            dirty = _.isNull ( result ) ? result : !!result;

      cache[absFolderPath] = {
        timestamp: new Date ().getTime (),
        dirty
      };

      returnVal = dirty;

    }

  }

  if ( updateCache ) await DirtyGitCache.write ( cache );

  return returnVal;

}

/* EXPORT */

export {DirtyGitCache, fetchDirtyGit};
