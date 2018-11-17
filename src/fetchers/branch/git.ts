
/* IMPORT */

import * as _ from 'lodash';
import * as  fs from 'fs';
import * as path from 'path';
import Utils from '../../utils';

/* CACHE */

let cache;

const BranchGitCache = {

  filename: '.vscode-projects-plus_branch-git-cache.json',

  read () {
    return Utils.cache.read ( BranchGitCache.filename );
  },

  write ( content ) {
    return Utils.cache.write ( BranchGitCache.filename, content );
  },

  delete () {
    cache = undefined;
    return Utils.cache.delete ( BranchGitCache.filename );
  }

};

/* GIT */

async function fetchBranchGit ( folderPath, updateCache = true ) {

  let returnVal;

  const absFolderPath = Utils.path.untildify ( folderPath ),
        gitPath = path.join ( absFolderPath, '.git' ),
        stat = await Utils.file.stat ( gitPath );

  if ( stat ) {

    if ( !cache ) cache = await BranchGitCache.read ();

    if ( cache[absFolderPath] && cache[absFolderPath].branch && cache[absFolderPath].timestamp >= new Date ( stat.mtime ).getTime () ) {

      returnVal = cache[absFolderPath].branch;

    } else {

      const command = 'git symbolic-ref --short HEAD',
            commandOptions = {
              cwd: absFolderPath,
              encoding: 'utf8'
            },
            result = await Utils.exec ( command, commandOptions, '' ),
            branch = _.trim ( result );

      cache[absFolderPath] = {
        timestamp: new Date ().getTime (),
        branch
      };

      returnVal = branch;

    }

  }

  if ( updateCache ) await BranchGitCache.write ( cache );

  return returnVal;

}

/* EXPORT */

export {BranchGitCache, fetchBranchGit};
