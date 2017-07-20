

/* IMPORT */

import {exec} from 'child_process';
import * as  fs from 'fs';
import * as path from 'path';
import * as pify from 'pify';
import Utils from '../../utils';

/* GIT */

const cache: any = {};

async function fetchDirtyGit ( folderpath ) {

  const gitPath = path.join ( folderpath, '.git' ),
        stat = await Utils.file.stat ( gitPath );

  if ( !stat ) return;

  if ( cache[folderpath] && cache[folderpath].timestamp >= new Date ( stat.mtime ).getTime () ) return cache[folderpath].dirty;

  const command = 'git diff-index --quiet HEAD -- || echo "dirty"';
  const result = await pify ( exec )( command, {
    cwd: folderpath,
    encoding: 'utf8'
  });

  cache[folderpath] = {
    timestamp: new Date ().getTime (),
    dirty: !!result
  };

  return !!result;

}

/* EXPORT */

export {fetchDirtyGit};
