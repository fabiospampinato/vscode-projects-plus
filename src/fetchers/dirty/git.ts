
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

async function fetchDirtyGit ( folderpath, updateCache = true ) {

  let returnVal;

  const gitPath = path.join ( folderpath, '.git' ),
        stat = await Utils.file.stat ( gitPath );

  if ( stat ) {

    if ( !cache ) cache = await DirtyGitCache.read ();

    if ( cache[folderpath] && !_.isNull ( cache[folderpath].dirty ) && cache[folderpath].timestamp >= new Date ( stat.mtime ).getTime () ) {

      returnVal = cache[folderpath].dirty;

    } else {

      const command = 'git status --porcelain --untracked-files | tail -n1',
            commandOptions = {
              cwd: folderpath,
              encoding: 'utf8'
            },
            result = await Utils.exec ( command, commandOptions, null ),
            dirty = _.isNull ( result ) ? result : !!result;

      cache[folderpath] = {
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
