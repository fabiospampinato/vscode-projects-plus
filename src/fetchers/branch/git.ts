

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

async function fetchBranchGit ( folderpath, updateCache = true ) {

  let returnVal;

  const gitPath = path.join ( folderpath, '.git' ),
        stat = await Utils.file.stat ( gitPath );

  if ( stat ) {

    if ( !cache ) cache = await BranchGitCache.read ();

    if ( cache[folderpath] && cache[folderpath].branch && cache[folderpath].timestamp >= new Date ( stat.mtime ).getTime () ) {

      returnVal = cache[folderpath].branch;

    } else {

      const command = 'git symbolic-ref --short HEAD --',
            commandOptions = {
              cwd: folderpath,
              encoding: 'utf8'
            },
            result = await Utils.exec ( command, commandOptions, '' ),
            branch = _.trim ( result );

      cache[folderpath] = {
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
