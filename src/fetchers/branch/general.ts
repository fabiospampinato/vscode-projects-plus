
/* IMPORT */

import * as _ from 'lodash';
import {fetchBranchGit} from './git';

/* GENERAL */

async function fetchBranchGeneral ( folderpath, updateCache = true ) {

  const fetchers = [fetchBranchGit];

  for ( let fetcher of fetchers ) {

    const result = await fetcher ( folderpath, updateCache );

    if ( _.isString ( result ) ) return result;

  }

  return false;

}

async function fetchBranchGeneralMulti ( folderpaths ) {

  const multi = {};

  for ( let i = 0, l = folderpaths.length; i < l; i++ ) {

    multi[folderpaths[i]] = await fetchBranchGeneral ( folderpaths[i], i === l - 1 );

  }

  return multi;

}

/* EXPORT */

export {fetchBranchGeneral, fetchBranchGeneralMulti};
