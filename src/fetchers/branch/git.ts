

/* IMPORT */

import * as _ from 'lodash';
import {exec} from 'child_process';
import * as  fs from 'fs';
import * as path from 'path';
import * as pify from 'pify';
import Utils from '../../utils';

/* CACHE */

const cacheFilename = '.vscode-projects-plus_branch-git-cache.json';

async function readCache () {
  return Utils.cache.read ( cacheFilename );
}

async function writeCache ( content ) {
  return Utils.cache.write ( cacheFilename, content );
}

/* GIT */

let cache;

async function fetchBranchGit ( folderpath, updateCache = true ) {

  let returnVal;

  const gitPath = path.join ( folderpath, '.git' ),
        stat = await Utils.file.stat ( gitPath );

  if ( stat ) {

    if ( !cache ) cache = await readCache ();

    if ( cache[folderpath] && cache[folderpath].timestamp >= new Date ( stat.mtime ).getTime () ) {

      returnVal = cache[folderpath].branch;

    } else {

      const command = 'git symbolic-ref --short HEAD --';
      const result = await pify ( exec )( command, {
        cwd: folderpath,
        encoding: 'utf8'
      });
      const branch = _.trim ( result );

      cache[folderpath] = {
        timestamp: new Date ().getTime (),
        branch
      };

      returnVal = branch;

    }

  }

  if ( updateCache ) await writeCache ( cache );

  return returnVal;

}

/* EXPORT */

export {fetchBranchGit};
