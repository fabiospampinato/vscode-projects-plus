
/* IMPORT */

import * as _ from 'lodash';
import {fetchBranchGit} from './git';

/* GENERAL */

async function fetchBranchGeneral ( folderPath, updateCache = true ) {

  const fetchers = [fetchBranchGit];

  for ( let fetcher of fetchers ) {

    const result = await fetcher ( folderPath, updateCache );

    if ( _.isString ( result ) ) return result;

  }

  return false;

}

async function fetchBranchGeneralMulti ( folderPaths ) {

  const multi = {};

  for ( let i = 0, l = folderPaths.length; i < l; i++ ) {

    multi[folderPaths[i]] = await fetchBranchGeneral ( folderPaths[i], i === l - 1 );

  }

  return multi;

}

/* EXPORT */

export {fetchBranchGeneral, fetchBranchGeneralMulti};
