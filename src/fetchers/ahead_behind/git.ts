
/* IMPORT */

import * as _ from 'lodash';
import * as  fs from 'fs';
import * as path from 'path';
import Utils from '../../utils';

/* CACHE */

let cache;

const AheadBehindGitCache = {

  filename: '.vscode-projects-plus_ahead-behind-git-cache.json',

  read () {
    return Utils.cache.read ( AheadBehindGitCache.filename );
  },

  write ( content ) {
    return Utils.cache.write ( AheadBehindGitCache.filename, content );
  },

  delete () {
    cache = undefined;
    return Utils.cache.delete ( AheadBehindGitCache.filename );
  }

};

/* GIT */

async function fetchAheadBehindGit ( folderPath, updateCache = true ) {

  let returnVal;

  const absFolderPath = Utils.path.untildify ( folderPath ),
        gitPath = path.join ( absFolderPath, '.git' ),
        stat = await Utils.file.stat ( gitPath );

  if ( stat ) {

    if ( !cache ) cache = await AheadBehindGitCache.read ();

    if ( cache[absFolderPath] && cache[absFolderPath].branch && cache[absFolderPath].timestamp >= new Date ( stat.mtime ).getTime () ) {

      returnVal = cache[absFolderPath].aheadBehind;

    } else {

      const command = 'git rev-list --left-right --count $(git symbolic-ref --short HEAD)...$(git rev-parse --abbrev-ref --symbolic-full-name @{u})',
            commandOptions = {
              cwd: absFolderPath,
              encoding: 'utf8'
            },
            result = await Utils.exec ( command, commandOptions, '0 0' ),
            [ahead, behind] = _.trim ( result ).split ( /\s+/ ),
            aheadBehind = {
              ahead: Number ( ahead ),
              behind: Number ( behind )
            };

      cache[absFolderPath] = {
        timestamp: new Date ().getTime (),
        aheadBehind
      };

      returnVal = aheadBehind;

    }

  }

  if ( updateCache ) await AheadBehindGitCache.write ( cache );

  return returnVal;

}

/* EXPORT */

export {AheadBehindGitCache, fetchAheadBehindGit};
