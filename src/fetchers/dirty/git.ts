

/* IMPORT */

import {exec} from 'child_process';
import * as  fs from 'fs';
import * as path from 'path';
import * as pify from 'pify';
import Utils from '../../utils';

/* CACHE */

const cacheFilename = '.vscode-projects-plus_dirty-git-cache.json';

async function readCache () {
  return Utils.cache.read ( cacheFilename );
}

async function writeCache ( content ) {
  return Utils.cache.write ( cacheFilename, content );
}

/* GIT */

let cache;

async function fetchDirtyGit ( folderpath, updateCache = true ) {

  let returnVal;

  const gitPath = path.join ( folderpath, '.git' ),
        stat = await Utils.file.stat ( gitPath );

  if ( stat ) {

    if ( !cache ) cache = await readCache ();

    if ( cache[folderpath] && cache[folderpath].timestamp >= new Date ( stat.mtime ).getTime () ) {

      returnVal = cache[folderpath].dirty;

    } else {

      const execOptions = {
        cwd: folderpath,
        encoding: 'utf8'
      };

      const command = 'git diff-index --quiet HEAD -- || echo "dirty"';
      const result = await pify ( exec )( command, execOptions );

      let dirty = !!result;

      if ( !dirty ) {

        const command = 'git ls-files --other --directory --no-empty-directory --exclude-standard';
        const result = await pify ( exec )( command, execOptions );

        dirty = !!result;

      }

      cache[folderpath] = {
        timestamp: new Date ().getTime (),
        dirty
      };

      returnVal = dirty;

    }

  }

  if ( updateCache ) await writeCache ( cache );

  return returnVal;

}

/* EXPORT */

export {fetchDirtyGit};
