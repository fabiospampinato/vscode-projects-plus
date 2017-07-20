

/* IMPORT */

import * as _ from 'lodash';
import {exec} from 'child_process';
import * as  fs from 'fs';
import * as path from 'path';
import * as pify from 'pify';
import Utils from '../../utils';

/* GIT */

const cache: any = {};

async function fetchBranchGit ( folderpath ) {

  const gitPath = path.join ( folderpath, '.git' ),
        stat = await Utils.file.stat ( gitPath );

  if ( !stat ) return;

  if ( cache[folderpath] && cache[folderpath].timestamp >= new Date ( stat.mtime ).getTime () ) return cache[folderpath].branch;

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

  return branch;

}

/* EXPORT */

export {fetchBranchGit};
