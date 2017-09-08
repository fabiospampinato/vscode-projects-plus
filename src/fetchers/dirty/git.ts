
/* IMPORT */

import * as _ from 'lodash';
import * as  fs from 'fs';
import * as path from 'path';
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

    if ( cache[folderpath] && !_.isNull ( cache[folderpath].dirty ) && cache[folderpath].timestamp >= new Date ( stat.mtime ).getTime () ) {

      returnVal = cache[folderpath].dirty;

    } else {

      const commandOptions = {
        cwd: folderpath,
        encoding: 'utf8'
      };

      const command = 'git diff-index --quiet HEAD -- || echo "dirty"',
            result = await Utils.exec ( command, commandOptions, null );

      let dirty = _.isNull ( result ) ? result : !!result;

      if ( !_.isNull ( dirty ) && !dirty ) {

        const command = 'git ls-files --other --directory --no-empty-directory --exclude-standard',
              result = await Utils.exec ( command, commandOptions, null );

        dirty = _.isNull ( result ) ? result : !!result;

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
